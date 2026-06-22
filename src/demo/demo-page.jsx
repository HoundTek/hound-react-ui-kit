import React, { useState, useEffect } from 'react';
import BoxBuilder from '../core/box';

const DemoPage = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleResize = () => setTick(t => t + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    new BoxBuilder("/demo")
      .viewport()
      .layout('vertical')
      .moveY(false)
      .children([
        new BoxBuilder("/demo/box1")
          .fixedHeight(200)
          .backgroundColor('lightblue')
          .moveX(false)
          .layout('horizontal')
          .children([
            new BoxBuilder("/demo/box1/1")
              .fixedWidth(200)
              .backgroundColor('lightgreen'),
            new BoxBuilder("/demo/box1/2")
              .minWidth(100)
              .defaultWidth(200)
              .backgroundColor('lightyellow'),
            new BoxBuilder("/demo/box1/3")
              .minWidth(100)
              .backgroundColor('lightred'),
          ]),
        new BoxBuilder("/demo/box2")
          .minHeight(100)
          .defaultHeight(200)
          .backgroundColor('lightgreen'),
        new BoxBuilder("/demo/box3")
          .minHeight(100)
          .backgroundColor('lightyellow'),
      ])
      .react()
  );
}

export default DemoPage;