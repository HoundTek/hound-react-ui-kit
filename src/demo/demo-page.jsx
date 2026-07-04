import React from 'react';
import BoxBuilder from '../core/box';

const DemoPage = () => {
  return (
      new BoxBuilder("/demo")
        .viewport()
        .layout('vertical')
        .moveY(false)
        .moveX(false)
        .children([
          new BoxBuilder("/demo/header")
            .fixedHeight(60)
            .backgroundColor('#4a90d9')
            .moveY(false)
            .moveX(false)
            .layout('horizontal')
            .children([
              new BoxBuilder("/demo/header/logo")
                .fixedWidth(120)
                .backgroundColor('#357abd')
                .children([
                  new BoxBuilder("/demo/header/logo/inner")
                    .backgroundColor('#286090')
                ]),
              new BoxBuilder("/demo/header/nav")
                .minWidth(200)
                .defaultWidth(400)
                .backgroundColor('#5aa0e9'),
              new BoxBuilder("/demo/header/user")
                .fixedWidth(100)
                .backgroundColor('#357abd'),
            ]),

          new BoxBuilder("/demo/main")
            .minHeight(200)
            .defaultHeight(400)
            .backgroundColor('#f0f0f0')
            .moveY(false)
            .moveX(false)
            .layout('horizontal')
            .children([
              new BoxBuilder("/demo/main/sidebar")
                .fixedWidth(200)
                .backgroundColor('#e0e0e0')
                .moveY(false)
                .moveX(false)
                .layout('vertical')
                .children([
                  new BoxBuilder("/demo/main/sidebar/menu1")
                    .fixedHeight(50)
                    .backgroundColor('#d0d0d0'),
                  new BoxBuilder("/demo/main/sidebar/menu2")
                    .fixedHeight(50)
                    .backgroundColor('#c0c0c0'),
                  new BoxBuilder("/demo/main/sidebar/scroll-menu")
                    .fixedHeight(150)
                    .backgroundColor('#d5d5d5')
                    .moveY(true)
                    .layout('vertical')
                    .children([
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item1")
                        .fixedHeight(30)
                        .backgroundColor('#e5e5e5'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item2")
                        .fixedHeight(30)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item3")
                        .fixedHeight(30)
                        .backgroundColor('#e5e5e5'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item4")
                        .fixedHeight(30)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item5")
                        .fixedHeight(30)
                        .backgroundColor('#e5e5e5'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item6")
                        .fixedHeight(30)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item7")
                        .fixedHeight(30)
                        .backgroundColor('#e5e5e5'),
                      new BoxBuilder("/demo/main/sidebar/scroll-menu/item8")
                        .fixedHeight(30)
                        .backgroundColor('#e0e0e0'),
                    ]),
                  new BoxBuilder("/demo/main/sidebar/menu3")
                    .fixedHeight(50)
                    .backgroundColor('#c0c0c0'),
                ]),

              new BoxBuilder("/demo/main/content")
                .minWidth(300)
                .backgroundColor('#ffffff')
                .moveY(false)
                .moveX(false)
                .layout('vertical')
                .children([
                  new BoxBuilder("/demo/main/content/title")
                    .fixedHeight(40)
                    .backgroundColor('#ffe4c4'),
                  
                  new BoxBuilder("/demo/main/content/cards")
                    .fixedHeight(120)
                    .backgroundColor('#fffacd')
                    .moveY(false)
                    .moveX(false)
                    .layout('horizontal')
                    .children([
                      new BoxBuilder("/demo/main/content/cards/card1")
                        .minWidth(150)
                        .defaultWidth(200)
                        .maxWidth(300)
                        .backgroundColor('#ffdab9')
                        .moveY(true)
                        .layout('vertical')
                        .children([
                          new BoxBuilder("/demo/main/content/cards/card1/line1")
                            .fixedHeight(25)
                            .backgroundColor('#ffe4cc'),
                          new BoxBuilder("/demo/main/content/cards/card1/line2")
                            .fixedHeight(25)
                            .backgroundColor('#ffe0c0'),
                          new BoxBuilder("/demo/main/content/cards/card1/line3")
                            .fixedHeight(25)
                            .backgroundColor('#ffe4cc'),
                          new BoxBuilder("/demo/main/content/cards/card1/line4")
                            .fixedHeight(25)
                            .backgroundColor('#ffe0c0'),
                          new BoxBuilder("/demo/main/content/cards/card1/line5")
                            .fixedHeight(25)
                            .backgroundColor('#ffe4cc'),
                          new BoxBuilder("/demo/main/content/cards/card1/line6")
                            .fixedHeight(25)
                            .backgroundColor('#ffe0c0'),
                          new BoxBuilder("/demo/main/content/cards/card1/line7")
                            .fixedHeight(25)
                            .backgroundColor('#ffe4cc'),
                        ]),
                      new BoxBuilder("/demo/main/content/cards/card2")
                        .minWidth(150)
                        .defaultWidth(200)
                        .maxWidth(300)
                        .backgroundColor('#ffcba4')
                        .moveY(true)
                        .layout('vertical')
                        .children([
                          new BoxBuilder("/demo/main/content/cards/card2/line1")
                            .fixedHeight(25)
                            .backgroundColor('#ffd4b0'),
                          new BoxBuilder("/demo/main/content/cards/card2/line2")
                            .fixedHeight(25)
                            .backgroundColor('#ffd0a8'),
                          new BoxBuilder("/demo/main/content/cards/card2/line3")
                            .fixedHeight(25)
                            .backgroundColor('#ffd4b0'),
                          new BoxBuilder("/demo/main/content/cards/card2/line4")
                            .fixedHeight(25)
                            .backgroundColor('#ffd0a8'),
                          new BoxBuilder("/demo/main/content/cards/card2/line5")
                            .fixedHeight(25)
                            .backgroundColor('#ffd4b0'),
                          new BoxBuilder("/demo/main/content/cards/card2/line6")
                            .fixedHeight(25)
                            .backgroundColor('#ffd0a8'),
                          new BoxBuilder("/demo/main/content/cards/card2/line7")
                            .fixedHeight(25)
                            .backgroundColor('#ffd4b0'),
                        ]),
                      new BoxBuilder("/demo/main/content/cards/card3")
                        .minWidth(150)
                        .defaultWidth(200)
                        .maxWidth(300)
                        .backgroundColor('#ffb980')
                        .moveY(true)
                        .layout('vertical')
                        .children([
                          new BoxBuilder("/demo/main/content/cards/card3/line1")
                            .fixedHeight(25)
                            .backgroundColor('#ffc990'),
                          new BoxBuilder("/demo/main/content/cards/card3/line2")
                            .fixedHeight(25)
                            .backgroundColor('#ffc588'),
                          new BoxBuilder("/demo/main/content/cards/card3/line3")
                            .fixedHeight(25)
                            .backgroundColor('#ffc990'),
                          new BoxBuilder("/demo/main/content/cards/card3/line4")
                            .fixedHeight(25)
                            .backgroundColor('#ffc588'),
                          new BoxBuilder("/demo/main/content/cards/card3/line5")
                            .fixedHeight(25)
                            .backgroundColor('#ffc990'),
                          new BoxBuilder("/demo/main/content/cards/card3/line6")
                            .fixedHeight(25)
                            .backgroundColor('#ffc588'),
                          new BoxBuilder("/demo/main/content/cards/card3/line7")
                            .fixedHeight(25)
                            .backgroundColor('#ffc990'),
                        ]),
                    ]),

                  new BoxBuilder("/demo/main/content/detail")
                    .fixedHeight(150)
                    .backgroundColor('#f0fff0')
                    .moveY(true)
                    .layout('vertical')
                    .children([
                      new BoxBuilder("/demo/main/content/detail/line1")
                        .fixedHeight(30)
                        .backgroundColor('#e0ffe0'),
                      new BoxBuilder("/demo/main/content/detail/line2")
                        .fixedHeight(30)
                        .backgroundColor('#d8ffd8'),
                      new BoxBuilder("/demo/main/content/detail/line3")
                        .fixedHeight(30)
                        .backgroundColor('#e0ffe0'),
                      new BoxBuilder("/demo/main/content/detail/line4")
                        .fixedHeight(30)
                        .backgroundColor('#d8ffd8'),
                      new BoxBuilder("/demo/main/content/detail/line5")
                        .fixedHeight(30)
                        .backgroundColor('#e0ffe0'),
                      new BoxBuilder("/demo/main/content/detail/line6")
                        .fixedHeight(30)
                        .backgroundColor('#d8ffd8'),
                      new BoxBuilder("/demo/main/content/detail/line7")
                        .fixedHeight(30)
                        .backgroundColor('#e0ffe0'),
                      new BoxBuilder("/demo/main/content/detail/line8")
                        .fixedHeight(30)
                        .backgroundColor('#d8ffd8'),
                    ]),
                ]),

              new BoxBuilder("/demo/main/right-panel")
                .fixedWidth(250)
                .backgroundColor('#e8e8e8')
                .moveY(false)
                .moveX(false)
                .layout('vertical')
                .children([
                  new BoxBuilder("/demo/main/right-panel/ads")
                    .fixedHeight(80)
                    .backgroundColor('#d8d8d8')
                    .moveY(true)
                    .layout('vertical')
                    .children([
                      new BoxBuilder("/demo/main/right-panel/ads/line1")
                        .fixedHeight(25)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/right-panel/ads/line2")
                        .fixedHeight(25)
                        .backgroundColor('#e8e8e8'),
                      new BoxBuilder("/demo/main/right-panel/ads/line3")
                        .fixedHeight(25)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/right-panel/ads/line4")
                        .fixedHeight(25)
                        .backgroundColor('#e8e8e8'),
                      new BoxBuilder("/demo/main/right-panel/ads/line5")
                        .fixedHeight(25)
                        .backgroundColor('#e0e0e0'),
                    ]),
                  new BoxBuilder("/demo/main/right-panel/trending")
                    .fixedHeight(100)
                    .backgroundColor('#d0d0d0')
                    .moveY(true)
                    .layout('vertical')
                    .children([
                      new BoxBuilder("/demo/main/right-panel/trending/item1")
                        .fixedHeight(25)
                        .backgroundColor('#d8d8d8'),
                      new BoxBuilder("/demo/main/right-panel/trending/item2")
                        .fixedHeight(25)
                        .backgroundColor('#d4d4d4'),
                      new BoxBuilder("/demo/main/right-panel/trending/item3")
                        .fixedHeight(25)
                        .backgroundColor('#d8d8d8'),
                      new BoxBuilder("/demo/main/right-panel/trending/item4")
                        .fixedHeight(25)
                        .backgroundColor('#d4d4d4'),
                      new BoxBuilder("/demo/main/right-panel/trending/item5")
                        .fixedHeight(25)
                        .backgroundColor('#d8d8d8'),
                      new BoxBuilder("/demo/main/right-panel/trending/item6")
                        .fixedHeight(25)
                        .backgroundColor('#d4d4d4'),
                      new BoxBuilder("/demo/main/right-panel/trending/item7")
                        .fixedHeight(25)
                        .backgroundColor('#d8d8d8'),
                    ]),
                  new BoxBuilder("/demo/main/right-panel/recommendations")
                    .fixedHeight(100)
                    .backgroundColor('#d8d8d8')
                    .moveY(true)
                    .layout('vertical')
                    .children([
                      new BoxBuilder("/demo/main/right-panel/recommendations/item1")
                        .fixedHeight(25)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/right-panel/recommendations/item2")
                        .fixedHeight(25)
                        .backgroundColor('#e4e4e4'),
                      new BoxBuilder("/demo/main/right-panel/recommendations/item3")
                        .fixedHeight(25)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/right-panel/recommendations/item4")
                        .fixedHeight(25)
                        .backgroundColor('#e4e4e4'),
                      new BoxBuilder("/demo/main/right-panel/recommendations/item5")
                        .fixedHeight(25)
                        .backgroundColor('#e0e0e0'),
                      new BoxBuilder("/demo/main/right-panel/recommendations/item6")
                        .fixedHeight(25)
                        .backgroundColor('#e4e4e4'),
                    ]),
                ]),
            ]),

          new BoxBuilder("/demo/footer")
            .fixedHeight(80)
            .backgroundColor('#333333')
            .moveY(false)
            .moveX(false)
            .layout('horizontal')
            .children([
              new BoxBuilder("/demo/footer/copyright")
                .minWidth(200)
                .defaultWidth(300)
                .backgroundColor('#444444'),
              new BoxBuilder("/demo/footer/links")
                .minWidth(400)
                .backgroundColor('#555555'),
              new BoxBuilder("/demo/footer/social")
                .fixedWidth(150)
                .backgroundColor('#444444'),
            ]),
        ])
        .react()
  );
}

export default DemoPage;