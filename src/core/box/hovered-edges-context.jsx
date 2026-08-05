/**
 * @file 边悬停状态的全局 Context。跨 EdgeLayer/CornerLayer 共享当前悬停的边 id 集合，
 *        使同一逻辑边在不同覆盖层中协同高亮，并避免拖拽会话期间的悬停抖动。
 */
import React, { createContext, useContext, useState, useCallback } from 'react';

const HoveredEdgesContext = createContext(null);

/**
 * 边悬停状态 Provider。维护一个 Set<string> 的悬停边 id 集合，提供单条/批量增删方法。
 * @param {Object} props 组件属性
 * @param {React.ReactNode} props.children 子节点
 * @returns {JSX.Element} Provider 元素
 */
export const HoveredEdgesProvider = ({ children }) => {
  const [hoveredEdges, setHoveredEdges] = useState(new Set());

  /**
   * 加入一条悬停边
   * @param {string} edgeId 边 id
   */
  const addHoveredEdge = useCallback((edgeId) => {
    setHoveredEdges(prev => new Set([...prev, edgeId]));
  }, []);

  /**
   * 移除一条悬停边
   * @param {string} edgeId 边 id
   */
  const removeHoveredEdge = useCallback((edgeId) => {
    setHoveredEdges(prev => {
      const next = new Set(prev);
      next.delete(edgeId);
      return next;
    });
  }, []);

  /**
   * 批量加入悬停边
   * @param {string[]} edgeIds 边 id 列表
   */
  const addHoveredEdges = useCallback((edgeIds) => {
    setHoveredEdges(prev => new Set([...prev, ...edgeIds]));
  }, []);

  /**
   * 批量移除悬停边
   * @param {string[]} edgeIds 边 id 列表
   */
  const removeHoveredEdges = useCallback((edgeIds) => {
    setHoveredEdges(prev => {
      const next = new Set(prev);
      edgeIds.forEach(id => next.delete(id));
      return next;
    });
  }, []);

  return (
    <HoveredEdgesContext.Provider value={{
      hoveredEdges,
      addHoveredEdge,
      removeHoveredEdge,
      addHoveredEdges,
      removeHoveredEdges,
    }}>
      {children}
    </HoveredEdgesContext.Provider>
  );
};

/**
 * 取边悬停状态与操作方法。必须在 HoveredEdgesProvider 内使用
 * @returns {{
 *   hoveredEdges: Set<string>,
 *   addHoveredEdge: (edgeId: string) => void,
 *   removeHoveredEdge: (edgeId: string) => void,
 *   addHoveredEdges: (edgeIds: string[]) => void,
 *   removeHoveredEdges: (edgeIds: string[]) => void
 * }} 悬停边集合与增删方法
 * @throws {Error} 未处于 Provider 内时抛错
 */
export const useHoveredEdges = () => {
  const context = useContext(HoveredEdgesContext);
  if (!context) {
    throw new Error('useHoveredEdges must be used within HoveredEdgesProvider');
  }
  return context;
};

export default HoveredEdgesContext;