import React, { createContext, useContext, useState, useCallback } from 'react';

const HoveredEdgesContext = createContext(null);

export const HoveredEdgesProvider = ({ children }) => {
  const [hoveredEdges, setHoveredEdges] = useState(new Set());

  const addHoveredEdge = useCallback((edgeId) => {
    setHoveredEdges(prev => new Set([...prev, edgeId]));
  }, []);

  const removeHoveredEdge = useCallback((edgeId) => {
    setHoveredEdges(prev => {
      const next = new Set(prev);
      next.delete(edgeId);
      return next;
    });
  }, []);

  const addHoveredEdges = useCallback((edgeIds) => {
    setHoveredEdges(prev => new Set([...prev, ...edgeIds]));
  }, []);

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

export const useHoveredEdges = () => {
  const context = useContext(HoveredEdgesContext);
  if (!context) {
    throw new Error('useHoveredEdges must be used within HoveredEdgesProvider');
  }
  return context;
};

export default HoveredEdgesContext;