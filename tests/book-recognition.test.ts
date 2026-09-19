import assert from "node:assert/strict";
import test from "node:test";
import {
  chooseBookRecognition,
  rankBookCandidates,
  recognitionSearchQueries,
} from "../src/domain/book-recognition.ts";

test("recognition strongly matches title and author present on a cover", () => {
  const result = chooseBookRecognition(
    "SHOE DOG\nA MEMOIR BY THE CREATOR OF NIKE\nPHIL KNIGHT",
    [
      { title: "Shoe Dog", author: "Phil Knight" },
      { title: "Dog Man", author: "Dav Pilkey" },
    ],
  );

  assert.equal(result?.title, "Shoe Dog");
  assert.equal(result?.author, "Phil Knight");
});

test("duplicate editions with the same title and author do not create ambiguity", () => {
  const ranked = rankBookCandidates(
    "A BRIEF HISTORY OF TIME\nSTEPHEN HAWKING",
    [
      { title: "A Brief History of Time", author: "Stephen Hawking" },
      { title: "A Brief History of Time", author: "Stephen Hawking" },
      { title: "Brief Answers to the Big Questions", author: "Stephen Hawking" },
    ],
  );

  assert.equal(ranked.filter((candidate) => candidate.title === "A Brief History of Time").length, 1);
  assert.equal(chooseBookRecognition(
    "A BRIEF HISTORY OF TIME\nSTEPHEN HAWKING",
    ranked,
  )?.title, "A Brief History of Time");
});

test("ambiguous same-title candidates with different creators are not guessed", () => {
  const result = chooseBookRecognition(
    "DAREDEVIL\n17\nMARVEL",
    [
      { title: "Daredevil", author: "Chip Zdarsky" },
      { title: "Daredevil", author: "Saladin Ahmed" },
    ],
  );

  assert.equal(result, null);
});

test("cover OCR lines generate a bounded set of useful metadata queries", () => {
  const queries = recognitionSearchQueries(
    "THE COURAGE TO BE DISLIKED\nICHIRO KISHIMI\nFUMITAKE KOGA\nA Japanese phenomenon",
  );

  assert.ok(queries.includes("THE COURAGE TO BE DISLIKED"));
  assert.ok(queries.some((query) => query.includes("ICHIRO KISHIMI")));
  assert.ok(queries.length <= 5);
});
