import type { Speaker, Subtitle } from "../types.ts";
import { speakerIdBase, srtCueSpeakerLabel } from "./speaker-label.ts";

export type FcpxmlFrameRate =
  | "23.98"
  | "24"
  | "25"
  | "29.97"
  | "30"
  | "50"
  | "59.94"
  | "60";

export interface GenerateFcpxmlOptions {
  frameRate?: FcpxmlFrameRate;
  font?: string;
  fontSize?: number;
  fontFace?: string;
  fontColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  alignment?: "left" | "center" | "right" | "justified";
  positionY?: number;
  includeSpeakerLabels?: boolean;
  speakers?: Speaker[];
}

interface FrameRateConfig {
  frameDuration: string;
  formatName: string;
  framesPerSec: number;
  toRational: (frames: number) => string;
}

const FRAME_RATE_CONFIGS: Record<FcpxmlFrameRate, FrameRateConfig> = {
  "23.98": {
    frameDuration: "1001/24000s",
    formatName: "FFVideoFormat1080p2398",
    framesPerSec: 24000 / 1001,
    toRational: (frames: number) =>
      frames <= 0 ? "0s" : `${frames * 1001}/24000s`,
  },
  "24": {
    frameDuration: "1/24s",
    formatName: "FFVideoFormat1080p24",
    framesPerSec: 24,
    toRational: (frames: number) => (frames <= 0 ? "0s" : `${frames}/24s`),
  },
  "25": {
    frameDuration: "1/25s",
    formatName: "FFVideoFormat1080p25",
    framesPerSec: 25,
    toRational: (frames: number) => (frames <= 0 ? "0s" : `${frames}/25s`),
  },
  "29.97": {
    frameDuration: "1001/30000s",
    formatName: "FFVideoFormat1080p2997",
    framesPerSec: 30000 / 1001,
    toRational: (frames: number) =>
      frames <= 0 ? "0s" : `${frames * 1001}/30000s`,
  },
  "30": {
    frameDuration: "1/30s",
    formatName: "FFVideoFormat1080p30",
    framesPerSec: 30,
    toRational: (frames: number) => (frames <= 0 ? "0s" : `${frames}/30s`),
  },
  "50": {
    frameDuration: "1/50s",
    formatName: "FFVideoFormat1080p50",
    framesPerSec: 50,
    toRational: (frames: number) => (frames <= 0 ? "0s" : `${frames}/50s`),
  },
  "59.94": {
    frameDuration: "1001/60000s",
    formatName: "FFVideoFormat1080p5994",
    framesPerSec: 60000 / 1001,
    toRational: (frames: number) =>
      frames <= 0 ? "0s" : `${frames * 1001}/60000s`,
  },
  "60": {
    frameDuration: "1/60s",
    formatName: "FFVideoFormat1080p60",
    framesPerSec: 60,
    toRational: (frames: number) => (frames <= 0 ? "0s" : `${frames}/60s`),
  },
};

/** Convert decimal seconds to rational frame-accurate FCPXML time representation */
export function formatRationalTime(
  seconds: number,
  frameRate: FcpxmlFrameRate = "24",
): string {
  if (seconds <= 0) return "0s";
  const config = FRAME_RATE_CONFIGS[frameRate] || FRAME_RATE_CONFIGS["24"];
  const frames = Math.round(seconds * config.framesPerSec);
  return config.toRational(frames);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates Final Cut Pro XML (FCPXML v1.11) with subtitles as styleable Title clips.
 * Titles are anchored on lane 1 connected to a gap element on the spine,
 * using Apple's built-in Basic Title effect.
 */
export function generateFcpxml(
  subtitles: Subtitle[],
  options: GenerateFcpxmlOptions = {},
): string {
  const frameRate = options.frameRate || "24";
  const config = FRAME_RATE_CONFIGS[frameRate] || FRAME_RATE_CONFIGS["24"];
  const font = options.font || "Helvetica Neue";
  const fontSize = options.fontSize ?? 48;
  const fontFace = options.fontFace || "Regular";
  const fontColor = options.fontColor || "1 1 1 1";
  const strokeColor = options.strokeColor || "0 0 0 1";
  const strokeWidth = options.strokeWidth ?? 2;
  const alignment = options.alignment || "center";
  const positionY = options.positionY ?? -400;

  let maxEndSec = 0;
  for (const sub of subtitles) {
    if (sub.end > maxEndSec) {
      maxEndSec = sub.end;
    }
  }

  const totalFrames = Math.round(maxEndSec * config.framesPerSec);
  const totalDuration = config.toRational(totalFrames);

  const idBase = speakerIdBase(subtitles);
  const titleNodes: string[] = [];

  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    let cueText = sub.text.trim();
    if (!cueText) continue;

    if (options.includeSpeakerLabels) {
      const label = srtCueSpeakerLabel(
        sub.speaker_id,
        options.speakers || [],
        idBase,
      );
      if (label) {
        cueText = `${label}: ${cueText}`;
      }
    }

    const startFrames = Math.round(sub.start * config.framesPerSec);
    const endFrames = Math.max(
      startFrames + 1,
      Math.round(sub.end * config.framesPerSec),
    );
    const durationFrames = endFrames - startFrames;

    const offsetStr = config.toRational(startFrames);
    const durationStr = config.toRational(durationFrames);
    const escapedText = escapeXml(cueText);
    const styleId = `ts${i + 1}`;

    titleNodes.push(`              <title ref="r2" lane="1" offset="${offsetStr}" duration="${durationStr}" start="0s" name="Subtitle ${i + 1}">
                <param name="Position" value="0 ${positionY}"/>
                <text>
                  <text-style ref="${styleId}">${escapedText}</text-style>
                </text>
                <text-style-def id="${styleId}">
                  <text-style font="${escapeXml(font)}" fontSize="${fontSize}" fontFace="${escapeXml(fontFace)}" fontColor="${fontColor}" strokeColor="${strokeColor}" strokeWidth="${strokeWidth}" alignment="${alignment}"/>
                </text-style-def>
              </title>`);
  }

  const titlesXml = titleNodes.join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.11">
  <resources>
    <format id="r1" name="${config.formatName}" frameDuration="${config.frameDuration}" width="1920" height="1080" colorSpace="1-1-1 (Rec. 709)"/>
    <effect id="r2" name="Basic Title" uid=".../Titles.localized/Bumper:Opener.localized/Basic Title.localized/Basic Title.moti"/>
  </resources>
  <library>
    <event name="AutoSubs">
      <project name="AutoSubs Subtitles">
        <sequence format="r1" duration="${totalDuration}" tcStart="0s" tcFormat="NDF" audioLayout="stereo" audioRate="48k">
          <spine>
            <gap offset="0s" duration="${totalDuration}" start="0s">
${titlesXml}
            </gap>
          </spine>
        </sequence>
      </project>
    </event>
  </library>
</fcpxml>
`;
}
