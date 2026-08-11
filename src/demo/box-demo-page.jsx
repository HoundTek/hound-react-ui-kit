/**
 * @file Box 演示页。以链式 API 构建一棵完整的布局树（header / main / footer，
 *        含侧栏、卡片、滚动列表、横向滚动、网格画廊等），并导出三层渲染组件。
 */
import React from 'react';
import BoxBuilder from '../core/box/box';
import { FloatingLayer, FloatingCloseButton, setOperable } from '../core/box/box-component';

/**
 * 演示页布局树根 builder。viewport 锁定双轴，纵向排列三大区域。
 * @type {BoxBuilder}
 */
const _builder = new BoxBuilder("@demo")
  .viewport()
  .layout('vertical')
  .moveY(false)
  .moveX(false)
  .children([
    new BoxBuilder("@demo/header")
      .fixedHeight(60)
      .backgroundColor('#4a90d9')
      .moveY(false)
      .moveX(false)
      .layout('horizontal')
      .children([
        new BoxBuilder("@demo/header/logo")
          .minWidth(80)
          .defaultWidth(120)
          .maxWidth(200)
          .backgroundColor('#357abd')
          .children([
            new BoxBuilder("@demo/header/logo/inner")
              .backgroundColor('#286090')
          ]),
        new BoxBuilder("@demo/header/nav")
          .minWidth(200)
          .defaultWidth(400)
          .backgroundColor('#5aa0e9'),
        new BoxBuilder("@demo/header/user")
          .minWidth(60)
          .defaultWidth(100)
          .maxWidth(160)
          .backgroundColor('#357abd'),
      ]),

    new BoxBuilder("@demo/main")
      .minHeight(200)
      .defaultHeight(400)
      .backgroundColor('#f0f0f0')
      .moveY(false)
      .moveX(false)
      .layout('horizontal')
      .children([
        new BoxBuilder("@demo/main/sidebar")
          .minWidth(150)
          .defaultWidth(200)
          .maxWidth(320)
          .backgroundColor('#e0e0e0')
          .moveY(false)
          .moveX(false)
          .layout('vertical')
          .children([
            new BoxBuilder("@demo/main/sidebar/menu1")
              .minHeight(30)
              .defaultHeight(50)
              .maxHeight(90)
              .backgroundColor('#d0d0d0'),
            new BoxBuilder("@demo/main/sidebar/menu2")
              .minHeight(30)
              .defaultHeight(50)
              .maxHeight(90)
              .backgroundColor('#c0c0c0'),
            new BoxBuilder("@demo/main/sidebar/scroll-menu")
              .fixedHeight(150)
              .backgroundColor('#d5d5d5')
              .moveY(true)
              .layout('vertical')
              .children([
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item1")
                  .fixedHeight(30)
                  .backgroundColor('#e5e5e5'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item2")
                  .fixedHeight(30)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item3")
                  .fixedHeight(30)
                  .backgroundColor('#e5e5e5'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item4")
                  .fixedHeight(30)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item5")
                  .fixedHeight(30)
                  .backgroundColor('#e5e5e5'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item6")
                  .fixedHeight(30)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item7")
                  .fixedHeight(30)
                  .backgroundColor('#e5e5e5'),
                new BoxBuilder("@demo/main/sidebar/scroll-menu/item8")
                  .fixedHeight(30)
                  .backgroundColor('#e0e0e0'),
              ]),
            new BoxBuilder("@demo/main/sidebar/menu3")
              .minHeight(30)
              .defaultHeight(50)
              .maxHeight(90)
              .backgroundColor('#c0c0c0'),
          ]),

        new BoxBuilder("@demo/main/content")
          .minWidth(300)
          .backgroundColor('#ffffff')
          .moveY(false)
          .moveX(false)
          .layout('vertical')
          .children([
            new BoxBuilder("@demo/main/content/title")
              .fixedHeight(40)
              .backgroundColor('#ffe4c4'),

            new BoxBuilder("@demo/main/content/cards")
              .fixedHeight(120)
              .backgroundColor('#fffacd')
              .moveY(false)
              .moveX(false)
              .layout('horizontal')
              .children([
                new BoxBuilder("@demo/main/content/cards/card1")
                  .minWidth(150)
                  .defaultWidth(200)
                  .maxWidth(300)
                  .backgroundColor('#ffdab9')
                  .moveY(true)
                  .layout('vertical')
                  .children([
                    new BoxBuilder("@demo/main/content/cards/card1/line1")
                      .fixedHeight(25)
                      .backgroundColor('#ffe4cc'),
                    new BoxBuilder("@demo/main/content/cards/card1/line2")
                      .fixedHeight(25)
                      .backgroundColor('#ffe0c0'),
                    new BoxBuilder("@demo/main/content/cards/card1/line3")
                      .fixedHeight(25)
                      .backgroundColor('#ffe4cc'),
                    new BoxBuilder("@demo/main/content/cards/card1/line4")
                      .fixedHeight(25)
                      .backgroundColor('#ffe0c0'),
                    new BoxBuilder("@demo/main/content/cards/card1/line5")
                      .fixedHeight(25)
                      .backgroundColor('#ffe4cc'),
                    new BoxBuilder("@demo/main/content/cards/card1/line6")
                      .fixedHeight(25)
                      .backgroundColor('#ffe0c0'),
                    new BoxBuilder("@demo/main/content/cards/card1/line7")
                      .fixedHeight(25)
                      .backgroundColor('#ffe4cc'),
                  ]),
                new BoxBuilder("@demo/main/content/cards/card2")
                  .minWidth(150)
                  .defaultWidth(200)
                  .maxWidth(300)
                  .backgroundColor('#ffcba4')
                  .moveY(true)
                  .layout('vertical')
                  .children([
                    new BoxBuilder("@demo/main/content/cards/card2/line1")
                      .fixedHeight(25)
                      .backgroundColor('#ffd4b0'),
                    new BoxBuilder("@demo/main/content/cards/card2/line2")
                      .fixedHeight(25)
                      .backgroundColor('#ffd0a8'),
                    new BoxBuilder("@demo/main/content/cards/card2/line3")
                      .fixedHeight(25)
                      .backgroundColor('#ffd4b0'),
                    new BoxBuilder("@demo/main/content/cards/card2/line4")
                      .fixedHeight(25)
                      .backgroundColor('#ffd0a8'),
                    new BoxBuilder("@demo/main/content/cards/card2/line5")
                      .fixedHeight(25)
                      .backgroundColor('#ffd4b0'),
                    new BoxBuilder("@demo/main/content/cards/card2/line6")
                      .fixedHeight(25)
                      .backgroundColor('#ffd0a8'),
                    new BoxBuilder("@demo/main/content/cards/card2/line7")
                      .fixedHeight(25)
                      .backgroundColor('#ffd4b0'),
                  ]),
                new BoxBuilder("@demo/main/content/cards/card3")
                  .minWidth(150)
                  .defaultWidth(200)
                  .maxWidth(300)
                  .backgroundColor('#ffb980')
                  .moveY(true)
                  .layout('vertical')
                  .children([
                    new BoxBuilder("@demo/main/content/cards/card3/line1")
                      .fixedHeight(25)
                      .backgroundColor('#ffc990'),
                    new BoxBuilder("@demo/main/content/cards/card3/line2")
                      .fixedHeight(25)
                      .backgroundColor('#ffc588'),
                    new BoxBuilder("@demo/main/content/cards/card3/line3")
                      .fixedHeight(25)
                      .backgroundColor('#ffc990'),
                    new BoxBuilder("@demo/main/content/cards/card3/line4")
                      .fixedHeight(25)
                      .backgroundColor('#ffc588'),
                    new BoxBuilder("@demo/main/content/cards/card3/line5")
                      .fixedHeight(25)
                      .backgroundColor('#ffc990'),
                    new BoxBuilder("@demo/main/content/cards/card3/line6")
                      .fixedHeight(25)
                      .backgroundColor('#ffc588'),
                    new BoxBuilder("@demo/main/content/cards/card3/line7")
                      .fixedHeight(25)
                      .backgroundColor('#ffc990'),
                  ]),
              ]),

            new BoxBuilder("@demo/main/content/detail")
              .fixedHeight(150)
              .backgroundColor('#f0fff0')
              .moveY(true)
              .layout('vertical')
              .children([
                new BoxBuilder("@demo/main/content/detail/line1")
                  .fixedHeight(30)
                  .backgroundColor('#e0ffe0'),
                new BoxBuilder("@demo/main/content/detail/line2")
                  .fixedHeight(30)
                  .backgroundColor('#d8ffd8'),
                new BoxBuilder("@demo/main/content/detail/line3")
                  .fixedHeight(30)
                  .backgroundColor('#e0ffe0'),
                new BoxBuilder("@demo/main/content/detail/line4")
                  .fixedHeight(30)
                  .backgroundColor('#d8ffd8'),
                new BoxBuilder("@demo/main/content/detail/line5")
                  .fixedHeight(30)
                  .backgroundColor('#e0ffe0'),
                new BoxBuilder("@demo/main/content/detail/line6")
                  .fixedHeight(30)
                  .backgroundColor('#d8ffd8'),
                new BoxBuilder("@demo/main/content/detail/line7")
                  .fixedHeight(30)
                  .backgroundColor('#e0ffe0'),
                new BoxBuilder("@demo/main/content/detail/line8")
                  .fixedHeight(30)
                  .backgroundColor('#d8ffd8'),
              ]),

            new BoxBuilder("@demo/main/content/horizontal-scroll")
              .fixedHeight(80)
              .backgroundColor('#e6e6fa')
              .moveX(true)
              .layout('horizontal')
              .children([
                new BoxBuilder("@demo/main/content/horizontal-scroll/item1")
                  .fixedWidth(100)
                  .backgroundColor('#d8d8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item2")
                  .fixedWidth(120)
                  .backgroundColor('#c8c8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item3")
                  .fixedWidth(100)
                  .backgroundColor('#d8d8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item4")
                  .fixedWidth(130)
                  .backgroundColor('#c8c8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item5")
                  .fixedWidth(110)
                  .backgroundColor('#d8d8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item6")
                  .fixedWidth(120)
                  .backgroundColor('#c8c8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item7")
                  .fixedWidth(100)
                  .backgroundColor('#d8d8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item8")
                  .fixedWidth(140)
                  .backgroundColor('#c8c8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item9")
                  .fixedWidth(110)
                  .backgroundColor('#d8d8ff'),
                new BoxBuilder("@demo/main/content/horizontal-scroll/item10")
                  .fixedWidth(120)
                  .backgroundColor('#c8c8ff'),
              ]),

            new BoxBuilder("@demo/main/content/gallery")
              .fixedHeight(140)
              .backgroundColor('#f5e6ff')
              .moveY(true)
              .layout('horizontal')
              .grid(160, 60)
              .children([
                new BoxBuilder("@demo/main/content/gallery/cell1")
                  .backgroundColor('#e6d0ff')
                  .moveY(false)
                  .moveX(false)
                  .layout('vertical')
                  .children([
                    new BoxBuilder("@demo/main/content/gallery/cell1/line1")
                      .minHeight(20)
                      .defaultHeight(30)
                      .maxHeight(40)
                      .backgroundColor('#d9c0f5'),
                    new BoxBuilder("@demo/main/content/gallery/cell1/line2")
                      .backgroundColor('#cfb0ee'),
                  ]),
                ...Array.from({ length: 17 }, (_, i) =>
                  new BoxBuilder(`@demo/main/content/gallery/cell${i + 2}`)
                    .backgroundColor(i % 2 === 0 ? '#e2d4f7' : '#d4c2f0')),
              ]),
          ]),

        new BoxBuilder("@demo/main/right-panel")
          .minWidth(200)
          .defaultWidth(250)
          .maxWidth(400)
          .backgroundColor('#e8e8e8')
          .moveY(false)
          .moveX(false)
          .layout('vertical')
          .children([
            new BoxBuilder("@demo/main/right-panel/ads")
              .fixedHeight(80)
              .backgroundColor('#d8d8d8')
              .moveY(true)
              .layout('vertical')
              .children([
                new BoxBuilder("@demo/main/right-panel/ads/line1")
                  .fixedHeight(25)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/right-panel/ads/line2")
                  .fixedHeight(25)
                  .backgroundColor('#e8e8e8'),
                new BoxBuilder("@demo/main/right-panel/ads/line3")
                  .fixedHeight(25)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/right-panel/ads/line4")
                  .fixedHeight(25)
                  .backgroundColor('#e8e8e8'),
                new BoxBuilder("@demo/main/right-panel/ads/line5")
                  .fixedHeight(25)
                  .backgroundColor('#e0e0e0'),
              ]),
            new BoxBuilder("@demo/main/right-panel/trending")
              .fixedHeight(100)
              .backgroundColor('#d0d0d0')
              .moveY(true)
              .layout('vertical')
              .children([
                new BoxBuilder("@demo/main/right-panel/trending/item1")
                  .fixedHeight(25)
                  .backgroundColor('#d8d8d8'),
                new BoxBuilder("@demo/main/right-panel/trending/item2")
                  .fixedHeight(25)
                  .backgroundColor('#d4d4d4'),
                new BoxBuilder("@demo/main/right-panel/trending/item3")
                  .fixedHeight(25)
                  .backgroundColor('#d8d8d8'),
                new BoxBuilder("@demo/main/right-panel/trending/item4")
                  .fixedHeight(25)
                  .backgroundColor('#d4d4d4'),
                new BoxBuilder("@demo/main/right-panel/trending/item5")
                  .fixedHeight(25)
                  .backgroundColor('#d8d8d8'),
                new BoxBuilder("@demo/main/right-panel/trending/item6")
                  .fixedHeight(25)
                  .backgroundColor('#d4d4d4'),
                new BoxBuilder("@demo/main/right-panel/trending/item7")
                  .fixedHeight(25)
                  .backgroundColor('#d8d8d8'),
              ]),
            new BoxBuilder("@demo/main/right-panel/recommendations")
              .fixedHeight(100)
              .backgroundColor('#d8d8d8')
              .moveY(true)
              .layout('vertical')
              .children([
                new BoxBuilder("@demo/main/right-panel/recommendations/item1")
                  .fixedHeight(25)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/right-panel/recommendations/item2")
                  .fixedHeight(25)
                  .backgroundColor('#e4e4e4'),
                new BoxBuilder("@demo/main/right-panel/recommendations/item3")
                  .fixedHeight(25)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/right-panel/recommendations/item4")
                  .fixedHeight(25)
                  .backgroundColor('#e4e4e4'),
                new BoxBuilder("@demo/main/right-panel/recommendations/item5")
                  .fixedHeight(25)
                  .backgroundColor('#e0e0e0'),
                new BoxBuilder("@demo/main/right-panel/recommendations/item6")
                  .fixedHeight(25)
                  .backgroundColor('#e4e4e4'),
              ]),
          ]),
      ]),

    new BoxBuilder("@demo/footer")
      .fixedHeight(80)
      .backgroundColor('#333333')
      .moveY(false)
      .moveX(false)
      .layout('horizontal')
      .children([
        new BoxBuilder("@demo/footer/copyright")
          .minWidth(200)
          .defaultWidth(300)
          .backgroundColor('#444444'),
        new BoxBuilder("@demo/footer/links")
          .minWidth(400)
          .backgroundColor('#555555')
          .draggable(false),
        new BoxBuilder("@demo/footer/social")
          .minWidth(100)
          .defaultWidth(150)
          .maxWidth(240)
          .backgroundColor('#444444'),
      ]),
  ]);

/**
 * 浮动窗口演示：浮动视口脱离主布局树，以屏幕坐标悬浮于页面上层（独立窗口形态）。
 * 固定位置/尺寸，内部为完整 Box 布局树（标题栏 + 可滚动正文），拖拽分界线同样可用。
 * movable(true).resizable(true) 开启窗口移动与缩放：拖动标题栏（dragHandle）移动窗口，
 * 拖动边缘/角手柄调整尺寸。窗口层级由系统按"父子窗口树 + 可操作窗口"管理
 *（见 floating-window-tree-design.md，下文的 _floatingModal 为其子窗口演示）；
 * 关闭按钮为通用浮动关闭按钮组件（FloatingCloseButton 经 content 注入标题栏右上角）。
 * @type {BoxBuilder}
 */
const _floatingWin = new BoxBuilder('@float/win')
  .floatingViewport()
  .posX(80)
  .posY(120)
  .fixedWidth(280)
  .fixedHeight(180)
  .movable(true)
  .resizable(true)
  .backgroundColor('#ffffff')
  .layout('vertical')
  .moveY(false)
  .moveX(false)
  .children([
    new BoxBuilder('@float/win/title')
      .fixedHeight(32)
      .backgroundColor('#4a90d9')
      .dragHandle()
      .moveY(false)
      .moveX(false)
      .content(
        <div style={{
          position: 'absolute', top: 0, right: 0, height: '100%',
          display: 'flex', alignItems: 'center', paddingRight: 6,
        }}>
          <FloatingCloseButton />
        </div>
      ),
    new BoxBuilder('@float/win/body')
      .moveY(true)
      .layout('vertical')
      .children([
        new BoxBuilder('@float/win/body/line1').fixedHeight(26).backgroundColor('#e8f0fa'),
        new BoxBuilder('@float/win/body/line2').fixedHeight(26).backgroundColor('#f0f0f0'),
        new BoxBuilder('@float/win/body/line3').fixedHeight(26).backgroundColor('#e8f0fa'),
        new BoxBuilder('@float/win/body/line4').fixedHeight(26).backgroundColor('#f0f0f0'),
        new BoxBuilder('@float/win/body/line5').fixedHeight(26).backgroundColor('#e8f0fa'),
      ]),
  ]);

/**
 * 复杂布局浮动窗口演示：在单一浮动视口内组合完整 Box 布局能力——
 * 标题栏（dragHandle 拖拽点）+ 工具栏（横向固定块）+ 主工作区（横向分栏，
 * 侧栏与内容区之间为可拖拽分界线）+ 内容区纵向嵌套（状态行 / 图表网格
 * grid / 可滚动日志）+ 底部状态栏。移动/缩放与简单窗口一致，
 * 内部布局完全复用主布局树机制（锁定分配 / 自由滚动 / Grid / 拖拽分界线）。
 * @type {BoxBuilder}
 */
const _floatingComplex = new BoxBuilder('@float/complex')
  .floatingViewport()
  .posX(560)
  .posY(240)
  .fixedWidth(560)
  .fixedHeight(380)
  .movable(true)
  .resizable(true)
  .backgroundColor('#ffffff')
  .layout('vertical')
  .moveY(false)
  .moveX(false)
  .children([
    // 标题栏（拖拽点 + 右上角关闭按钮）
    new BoxBuilder('@float/complex/title')
      .fixedHeight(36)
      .backgroundColor('#4a90d9')
      .dragHandle()
      .moveY(false)
      .moveX(false)
      .content(
        <div style={{
          position: 'absolute', top: 0, right: 0, height: '100%',
          display: 'flex', alignItems: 'center', paddingRight: 6,
        }}>
          <FloatingCloseButton />
        </div>
      ),
    // 工具栏：横向排列固定宽度按钮块
    new BoxBuilder('@float/complex/toolbar')
      .fixedHeight(32)
      .layout('horizontal')
      .moveX(false)
      .moveY(false)
      .backgroundColor('#eef3fa')
      .children([
        new BoxBuilder('@float/complex/toolbar/btn1').fixedWidth(48).backgroundColor('#c9d7ea'),
        new BoxBuilder('@float/complex/toolbar/btn2').fixedWidth(48).backgroundColor('#c9d7ea'),
        new BoxBuilder('@float/complex/toolbar/btn3').fixedWidth(48).backgroundColor('#c9d7ea'),
        new BoxBuilder('@float/complex/toolbar/btn4').fixedWidth(48).backgroundColor('#c9d7ea'),
        new BoxBuilder('@float/complex/toolbar/btn5').fixedWidth(48).backgroundColor('#c9d7ea'),
        new BoxBuilder('@float/complex/toolbar/btn6').fixedWidth(48).backgroundColor('#c9d7ea'),
      ]),
    // 主工作区：横向分栏（侧栏 + 内容区，分界线可拖）
    new BoxBuilder('@float/complex/workspace')
      .layout('horizontal')
      .moveX(false)
      .moveY(false)
      .children([
        // 侧栏：垂直菜单列表（可滚动），宽度可拖（default 150 / min 100 / max 220）
        new BoxBuilder('@float/complex/workspace/sidebar')
          .defaultWidth(150)
          .minWidth(100)
          .maxWidth(220)
          .layout('vertical')
          .moveY(true)
          .backgroundColor('#f7f8fa')
          .children([
            new BoxBuilder('@float/complex/workspace/sidebar/menu1').fixedHeight(30).backgroundColor('#4a90d9'),
            new BoxBuilder('@float/complex/workspace/sidebar/menu2').fixedHeight(30).backgroundColor('#e3ecf7'),
            new BoxBuilder('@float/complex/workspace/sidebar/menu3').fixedHeight(30).backgroundColor('#e3ecf7'),
            new BoxBuilder('@float/complex/workspace/sidebar/menu4').fixedHeight(30).backgroundColor('#e3ecf7'),
            new BoxBuilder('@float/complex/workspace/sidebar/menu5').fixedHeight(30).backgroundColor('#e3ecf7'),
            new BoxBuilder('@float/complex/workspace/sidebar/menu6').fixedHeight(30).backgroundColor('#e3ecf7'),
          ]),
        // 内容区：纵向嵌套（状态行 / 网格 / 日志）
        new BoxBuilder('@float/complex/workspace/content')
          .layout('vertical')
          .moveX(false)
          .moveY(false)
          .backgroundColor('#ffffff')
          .children([
            // 状态行：三个弹性统计块
            new BoxBuilder('@float/complex/workspace/content/stats')
              .fixedHeight(56)
              .layout('horizontal')
              .moveX(false)
              .moveY(false)
              .children([
                new BoxBuilder('@float/complex/workspace/content/stats/s1').backgroundColor('#e3f2fd'),
                new BoxBuilder('@float/complex/workspace/content/stats/s2').backgroundColor('#e8f5e9'),
                new BoxBuilder('@float/complex/workspace/content/stats/s3').backgroundColor('#fff8e1'),
              ]),
            // 图表网格：grid(140, 58) 自动排布 2x2
            new BoxBuilder('@float/complex/workspace/content/grid')
              .fixedHeight(130)
              .grid(140, 58)
              .backgroundColor('#fdfdfd')
              .children([
                new BoxBuilder('@float/complex/workspace/content/grid/c1').backgroundColor('#fbe9e7'),
                new BoxBuilder('@float/complex/workspace/content/grid/c2').backgroundColor('#e8eaf6'),
                new BoxBuilder('@float/complex/workspace/content/grid/c3').backgroundColor('#e0f7fa'),
                new BoxBuilder('@float/complex/workspace/content/grid/c4').backgroundColor('#f1f8e9'),
              ]),
            // 日志列表：内容超出时滚动（moveY true）
            new BoxBuilder('@float/complex/workspace/content/logs')
              .layout('vertical')
              .moveY(true)
              .backgroundColor('#ffffff')
              .children([
                new BoxBuilder('@float/complex/workspace/content/logs/l1').fixedHeight(26).backgroundColor('#f5f5f5'),
                new BoxBuilder('@float/complex/workspace/content/logs/l2').fixedHeight(26).backgroundColor('#ffffff'),
                new BoxBuilder('@float/complex/workspace/content/logs/l3').fixedHeight(26).backgroundColor('#f5f5f5'),
                new BoxBuilder('@float/complex/workspace/content/logs/l4').fixedHeight(26).backgroundColor('#ffffff'),
                new BoxBuilder('@float/complex/workspace/content/logs/l5').fixedHeight(26).backgroundColor('#f5f5f5'),
                new BoxBuilder('@float/complex/workspace/content/logs/l6').fixedHeight(26).backgroundColor('#ffffff'),
                new BoxBuilder('@float/complex/workspace/content/logs/l7').fixedHeight(26).backgroundColor('#f5f5f5'),
                new BoxBuilder('@float/complex/workspace/content/logs/l8').fixedHeight(26).backgroundColor('#ffffff'),
              ]),
          ]),
      ]),
    // 底部状态栏
    new BoxBuilder('@float/complex/status')
      .fixedHeight(24)
      .layout('horizontal')
      .moveX(false)
      .moveY(false)
      .backgroundColor('#e8e8e8')
      .children([
        new BoxBuilder('@float/complex/status/left').defaultWidth(120).backgroundColor('#dcdcdc'),
        new BoxBuilder('@float/complex/status/center').backgroundColor('#e3e3e3'),
        new BoxBuilder('@float/complex/status/right').defaultWidth(120).backgroundColor('#dcdcdc'),
      ]),
  ]);

/**
 * 子窗口演示：child(_floatingWin) 声明 @float/modal 为 @float/win 的子窗口——
 * 恒层叠于父窗口之上（树模型父子关系，见 floating-window-tree-design.md）。
 * 遮罩完全由可操作窗口决定：下方 setOperable(_floatingWin) 将 @float/win 设为可操作，
 * 出现单一遮罩，仅放行 @float/win 及其子窗口链（即本窗口），其余窗口与页面被遮住。
 * @type {BoxBuilder}
 */
const _floatingModal = new BoxBuilder('@float/modal')
  .floatingViewport()
  .child(_floatingWin)
  .posX(300)
  .posY(220)
  .fixedWidth(240)
  .fixedHeight(100)
  .backgroundColor('#ffffff')
  .layout('vertical')
  .moveY(false)
  .moveX(false)
  .children([
    new BoxBuilder('@float/modal/title')
      .fixedHeight(28)
      .backgroundColor('#ffdab9')
      .moveY(false)
      .moveX(false)
      .content(
        <div style={{
          position: 'absolute', top: 0, right: 0, height: '100%',
          display: 'flex', alignItems: 'center', paddingRight: 6,
        }}>
          <FloatingCloseButton />
        </div>
      ),
    new BoxBuilder('@float/modal/body')
      .moveY(true)
      .layout('vertical')
      .children([
        new BoxBuilder('@float/modal/body/line1').fixedHeight(20).backgroundColor('#fff5ee'),
        new BoxBuilder('@float/modal/body/line2').fixedHeight(20).backgroundColor('#f8f8f8'),
      ]),
  ]);

// 演示可操作窗口（遮罩唯一来源）：@float/win 及其子窗口链可操作，其余被遮罩挡住。
// 注释掉本行则回到默认态（可操作窗口 = 根 viewport，无遮罩）。
setOperable(_floatingWin);

// 浮动窗口演示默认初始隐藏：FloatingLayer 全局渲染所有浮动视口，若初始可见会
// 悬浮遮挡默认页（预设展示台）。工作台页挂载时经 openFloatingDemo 打开，切换离开时
// 经 closeFloatingDemo 关闭（见 cell-demo-page）。
[_floatingWin, _floatingComplex, _floatingModal].forEach(w => w.close());

/**
 * 打开浮动窗口演示（工作台页挂载时调用）。
 * @returns {void}
 */
const openFloatingDemo = () => {
  _floatingWin.open();
  _floatingComplex.open();
  _floatingModal.open();
};

/**
 * 关闭浮动窗口演示（离开工作台页时调用）。
 * @returns {void}
 */
const closeFloatingDemo = () => {
  _floatingWin.close();
  _floatingComplex.close();
  _floatingModal.close();
};

/**
 * 演示页内容层组件：渲染布局树的内容层（承担实际布局与子项渲染）
 * @returns {JSX.Element} 内容层元素
 */
const DemoPageContent = () => _builder.reactContent();

/**
 * 演示页边覆盖层组件：渲染拖拽分界线（EdgeLayer）
 * @returns {JSX.Element} 边覆盖层元素
 */
const DemoPageEdge = () => _builder.reactEdge();

/**
 * 演示页角覆盖层组件：渲染双轴交点（CornerLayer）
 * @returns {JSX.Element} 角覆盖层元素
 */
const DemoPageCorner = () => _builder.reactCorner();

/**
 * 演示页浮动层组件：FloatingLayer 统一渲染所有浮动视口（含模态遮罩）
 * @returns {JSX.Element|null} 浮动层元素；无浮动视口时返回 null
 */
const DemoPageFloating = () => <FloatingLayer />;

export {
  DemoPageContent, DemoPageEdge, DemoPageCorner, DemoPageFloating,
  openFloatingDemo, closeFloatingDemo,
};
