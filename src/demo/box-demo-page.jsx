import React from 'react';
import BoxBuilder from '../core/box/box';

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

const DemoPageContent = () => _builder.reactContent();
const DemoPageEdge = () => _builder.reactEdge();
const DemoPageCorner = () => _builder.reactCorner();

export { DemoPageContent, DemoPageEdge, DemoPageCorner };
