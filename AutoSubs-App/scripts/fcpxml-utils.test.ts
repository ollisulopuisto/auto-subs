import test from "node:test";
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { existsSync, copyFileSync, unlinkSync } from "node:fs";
import {
  generateFcpxml,
  formatRationalTime,
  type GenerateFcpxmlOptions,
} from "../src/utils/fcpxml-utils.ts";
import {
  buildSubtitleExportContent,
  subtitleExportDialogOptions,
} from "../src/utils/export-file.ts";
import type { Subtitle, Speaker } from "../src/types.ts";

const sampleSubtitles: Subtitle[] = [
  {
    id: 0,
    start: 1.0,
    end: 3.5,
    text: "Hello world & welcome!",
    words: [],
  },
  {
    id: 1,
    start: 4.0,
    end: 6.25,
    text: "Second subtitle cue\nwith two lines <tag>",
    words: [],
    speaker_id: "0",
  },
];

const sampleSpeakers: Speaker[] = [
  {
    id: "0",
    name: "Alice",
  },
];

test("formatRationalTime formats exact frames for standard timebases", () => {
  // 24 fps
  assert.equal(formatRationalTime(0, "24"), "0s");
  assert.equal(formatRationalTime(1.0, "24"), "24/24s");
  assert.equal(formatRationalTime(2.5, "24"), "60/24s");

  // 25 fps
  assert.equal(formatRationalTime(0, "25"), "0s");
  assert.equal(formatRationalTime(1.0, "25"), "25/25s");

  // 23.976 (24000/1001) fps
  assert.equal(formatRationalTime(0, "23.98"), "0s");
  assert.equal(formatRationalTime(1.0, "23.98"), "24024/24000s");
});

test("generateFcpxml generates valid XML structure with title clips on lane 1", () => {
  const xml = generateFcpxml(sampleSubtitles, { frameRate: "24" });

  assert.match(xml, /<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<!DOCTYPE fcpxml>/);
  assert.match(xml, /<fcpxml version="1.11">/);
  assert.match(xml, /<resources>/);
  assert.match(xml, /<format id="r1"/);
  assert.match(xml, /<effect id="r2" name="Basic Title"/);
  assert.match(xml, /<spine>/);
  assert.match(xml, /<gap /);
  assert.match(xml, /<title ref="r2" lane="1"/);
  // XML escaping
  assert.match(xml, /Hello world &amp; welcome!/);
  assert.match(xml, /with two lines &lt;tag&gt;/);
  // Scoped text style def
  assert.match(xml, /<text-style-def id="ts1">/);
});

test("generateFcpxml custom options are applied", () => {
  const xml = generateFcpxml(sampleSubtitles, {
    frameRate: "25",
    font: "Courier",
    fontSize: 60,
    fontColor: "1 1 0 1",
    strokeColor: "0 0 0 1",
    strokeWidth: 3,
    alignment: "left",
    positionY: -350,
  });

  assert.match(xml, /frameDuration="1\/25s"/);
  assert.match(xml, /font="Courier"/);
  assert.match(xml, /fontSize="60"/);
  assert.match(xml, /fontColor="1 1 0 1"/);
  assert.match(xml, /strokeWidth="3"/);
  assert.match(xml, /alignment="left"/);
  assert.match(xml, /<param name="Position" value="0 -350"\/>/);
});

test("generateFcpxml supports speaker label option", () => {
  const xml = generateFcpxml(sampleSubtitles, {
    includeSpeakerLabels: true,
    speakers: sampleSpeakers,
  });

  assert.match(xml, /Alice: Second subtitle cue/);
});

test("FCPXML passes official Apple DTD validation if available", () => {
  const appleDtdPath =
    "/Applications/Final Cut Pro.app/Contents/Frameworks/Interchange.framework/Versions/A/Resources/FCPXMLv1_11.dtd";
  if (!existsSync(appleDtdPath)) {
    return;
  }

  const xml = generateFcpxml(sampleSubtitles, { frameRate: "24" });
  // xmllint doesn't like spaces in paths directly with --dtdvalid, copy to temp
  const tempDtd = `/tmp/fcpxml_test_${Date.now()}.dtd`;
  copyFileSync(appleDtdPath, tempDtd);

  try {
    execSync(`xmllint --noout --dtdvalid "${tempDtd}" -`, {
      input: xml,
      encoding: "utf-8",
    });
  } finally {
    if (existsSync(tempDtd)) {
      unlinkSync(tempDtd);
    }
  }
});

test("export dialog and content integration for fcpxml", () => {
  const opts = subtitleExportDialogOptions("fcpxml", "my_video");
  assert.equal(opts.defaultPath, "my_video.fcpxml");
  assert.deepEqual(opts.filters, [{ name: "FCPXML Files", extensions: ["fcpxml"] }]);

  const content = buildSubtitleExportContent("fcpxml", sampleSubtitles, sampleSpeakers);
  assert.match(content, /<fcpxml version="1.11">/);
  assert.match(content, /Hello world &amp; welcome!/);
});
