import React from "react";
import { Composition } from "remotion";
import { VideoStory, VideoStoryProps } from "./Composition";

const FPS = 30;
// Trần trên để Remotion cấp phát metadata ban đầu — thời lượng THẬT tính lại
// đúng theo tổng durationInFrames của các cảnh qua calculateMetadata bên dưới.
const MAX_DURATION_SECONDS = 200;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="VideoStory"
      component={VideoStory}
      durationInFrames={FPS * MAX_DURATION_SECONDS}
      fps={FPS}
      width={1280}
      height={720}
      defaultProps={{ scenes: [] } as VideoStoryProps}
      calculateMetadata={async ({ props }) => {
        const { scenes, transitionFrames } = props as VideoStoryProps;
        const rawTotal = scenes.reduce((sum, s) => sum + s.durationInFrames, 0);
        // 2 cảnh liền kề giờ CHỒNG LẤN transitionFrames khung hình (crossfade
        // thật qua TransitionSeries, xem Composition.tsx) — tổng thời lượng
        // THẬT của cả video vì vậy NGẮN HƠN tổng cộng dồn từng cảnh đúng bằng
        // số khung hình chồng lấn đó, không trừ thì video bị coi dài hơn thật.
        const overlapTotal = scenes.length > 1 ? (scenes.length - 1) * (transitionFrames || 0) : 0;
        const totalFrames = rawTotal - overlapTotal;
        return { durationInFrames: totalFrames > 0 ? totalFrames : FPS * 5 };
      }}
    />
  );
};
