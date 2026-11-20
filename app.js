import {
  Accidental,
  Flow,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
} from "vexflow/core";
import { Font as BravuraFont } from "vexflow/font/bravura";

const FEEDBACK_DELAY_MS = 1500;

const NOTES = [
  { name: "C4", label: "c'", position: 0.5 },
  { name: "C#4", label: "cis'", alternateLabel: "des'", position: 1, isBlack: true },
  { name: "D4", label: "d'", position: 1.5 },
  { name: "D#4", label: "dis'", alternateLabel: "es'", position: 2, isBlack: true },
  { name: "E4", label: "e'", position: 2.5 },
  { name: "F4", label: "f'", position: 3.5 },
  { name: "F#4", label: "fis'", alternateLabel: "ges'", position: 4, isBlack: true },
  { name: "G4", label: "g'", position: 4.5 },
  { name: "G#4", label: "gis'", alternateLabel: "as'", position: 5, isBlack: true },
  { name: "A4", label: "a'", position: 5.5 },
  { name: "A#4", label: "ais'", alternateLabel: "b'", position: 6, isBlack: true },
  { name: "B4", label: "h'", position: 6.5 },
  { name: "C5", label: "c''", position: 7.5 },
  { name: "C#5", label: "cis''", alternateLabel: "des''", position: 8, isBlack: true },
  { name: "D5", label: "d''", position: 8.5 },
  { name: "D#5", label: "dis''", alternateLabel: "es''", position: 9, isBlack: true },
  { name: "E5", label: "e''", position: 9.5 },
  { name: "F5", label: "f''", position: 10.5 },
  { name: "F#5", label: "fis''", alternateLabel: "ges''", position: 11, isBlack: true },
  { name: "G5", label: "g''", position: 11.5 },
  { name: "G#5", label: "gis''", alternateLabel: "as''", position: 12, isBlack: true },
  { name: "A5", label: "a''", position: 12.5 },
  { name: "A#5", label: "ais''", alternateLabel: "b''", position: 13, isBlack: true },
  { name: "B5", label: "h''", position: 13.5 },
];

const solvedCountElement = document.querySelector("#solved-count");
const correctCountElement = document.querySelector("#correct-count");
const wrongCountElement = document.querySelector("#wrong-count");
const accuracyElement = document.querySelector("#accuracy");
const questionCountElement = document.querySelector("#question-count");
const staffElement = document.querySelector("#staff");
const keyboardElement = document.querySelector("#keyboard");
const feedbackElement = document.querySelector("#feedback");
const labelModeButtons = document.querySelectorAll("[data-label-mode]");

let currentNote = null;
let previousNoteName = null;
let solvedCount = 0;
let correctCount = 0;
let wrongCount = 0;
let answered = false;
let labelMode = "all";

function renderQuestion() {
  const availableNotes = NOTES.filter((note) => note.name !== previousNoteName);
  if (availableNotes.length === 0) {
    throw new Error("No notes available for the next question.");
  }

  currentNote = availableNotes[Math.floor(Math.random() * availableNotes.length)];
  previousNoteName = currentNote.name;
  answered = false;
  feedbackElement.textContent = "";
  feedbackElement.className = "feedback";
  questionCountElement.textContent = `Aufgabe ${solvedCount + 1}`;
  renderStaff(currentNote);
  renderKeyboard();
}

function updateStats() {
  solvedCountElement.textContent = String(solvedCount);
  correctCountElement.textContent = String(correctCount);
  wrongCountElement.textContent = String(wrongCount);
  const accuracy = solvedCount === 0 ? 0 : Math.round((correctCount / solvedCount) * 100);
  accuracyElement.textContent = `${accuracy}%`;
}

function renderStaff(note) {
  staffElement.replaceChildren();
  const width = Math.max(staffElement.clientWidth, 320);
  const renderer = new Renderer(staffElement, Renderer.Backends.SVG);
  renderer.resize(width, 180);

  const context = renderer.getContext();
  const stave = new Stave(12, 18, width - 24);
  stave.addClef("treble").setContext(context).draw();

  const [, pitch, octave] = note.name.match(/^([A-G]#?)([0-9])$/) ?? [];
  if (!pitch || !octave) {
    throw new Error(`Unsupported note name: ${note.name}`);
  }

  const accidental = pitch.endsWith("#") ? "#" : "";
  const vexFlowKey = `${pitch[0].toLowerCase()}${accidental}/${octave}`;
  const staveNote = new StaveNote({
    keys: [vexFlowKey],
    duration: "q",
    clef: "treble",
    auto_stem: true,
  });
  if (accidental) {
    staveNote.addModifier(new Accidental(accidental), 0);
  }
  Formatter.FormatAndDraw(context, stave, [staveNote]);

  const noteGroup = staffElement.querySelector(".vf-stavenote");
  const noteHead = noteGroup?.querySelector(".vf-notehead");
  if (!noteGroup || !noteHead) {
    throw new Error("VexFlow did not render the target note.");
  }

  const noteHeadBounds = noteHead.getBBox();
  const noteOffset = width / 2 - (noteHeadBounds.x + noteHeadBounds.width / 2);
  noteGroup.setAttribute("transform", `translate(${noteOffset} 0)`);
  staffElement.querySelector("svg")?.setAttribute("aria-hidden", "true");
  staffElement.setAttribute(
    "aria-label",
    "Eine Note im Violinschlüssel. Finde die passende Taste."
  );
}

function renderKeyboard() {
  keyboardElement.replaceChildren();

  NOTES.forEach((note) => {
    const key = createKey(note, note.isBlack ? "black-key" : "white-key");
    if (note.isBlack) {
      key.style.left = `${(note.position / 14) * 100}%`;
    }
    keyboardElement.append(key);
  });

  applyLabelMode();
}

function createKey(note, colorClass) {
  const key = document.createElement("button");
  key.type = "button";
  key.className = `piano-key ${colorClass}`;
  key.dataset.note = note.name;
  key.setAttribute(
    "aria-label",
    note.alternateLabel
      ? `Taste ${note.label} oder ${note.alternateLabel}`
      : `Taste ${note.label}`
  );
  [note.label, note.alternateLabel].filter(Boolean).forEach((label) => {
    const labelElement = document.createElement("span");
    labelElement.className = "key-label";
    labelElement.textContent = label;
    key.append(labelElement);
  });
  key.addEventListener("click", () => selectNote(note.name));
  return key;
}

function applyLabelMode() {
  labelModeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.labelMode === labelMode));
  });

  keyboardElement.querySelectorAll(".piano-key").forEach((key) => {
    const hideLabel = labelMode === "none"
      || (labelMode === "white" && key.classList.contains("black-key"));
    key.querySelectorAll(".key-label").forEach((label) => {
      label.hidden = hideLabel;
    });
  });
}

labelModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    labelMode = button.dataset.labelMode;
    applyLabelMode();
  });
});

function selectNote(selectedName) {
  if (answered) return;

  answered = true;
  const correctNote = currentNote;
  const isCorrect = selectedName === correctNote.name;
  solvedCount += 1;
  if (isCorrect) correctCount += 1;
  else wrongCount += 1;
  updateStats();

  keyboardElement.querySelectorAll(".piano-key").forEach((key) => {
    key.disabled = true;
    if (key.dataset.note === correctNote.name) key.classList.add("is-correct");
    if (key.dataset.note === selectedName && !isCorrect) key.classList.add("is-wrong");
  });

  feedbackElement.classList.add(isCorrect ? "is-correct" : "is-wrong");
  feedbackElement.textContent = isCorrect
    ? `Richtig! Das ist ${correctNote.label}.`
    : `Falsch. Die richtige Taste ist ${correctNote.label}.`;

  window.setTimeout(() => {
    renderQuestion();
    keyboardElement.querySelector(".white-key")?.focus();
  }, FEEDBACK_DELAY_MS);
}

async function initialize() {
  await Flow.fetchMusicFont("Bravura", BravuraFont);
  Flow.setMusicFont("Bravura");
  renderQuestion();

  window.addEventListener("resize", () => {
    if (currentNote) renderStaff(currentNote);
  });
}

initialize();
