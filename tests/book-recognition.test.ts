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


test("fragmented Animal Farm OCR becomes useful combined searches", () => {
  const queries = recognitionSearchQueries(
    "& ANIMAL\nP\nÀ\n= FARM ←\nEORGE ORWELL\n>\ns\n<",
  );

  assert.equal(queries[0], "animal farm eorge orwell");
  assert.ok(queries.includes("animal farm"));
  assert.ok(!queries.some((query) => /(^|\s)[pas](\s|$)/.test(query)));
});

test("Animal Farm can be selected even when OCR drops the first letter of George", () => {
  const result = chooseBookRecognition(
    "& ANIMAL\n= FARM ←\nEORGE ORWELL",
    [
      { title: "Animal Farm", author: "George Orwell" },
      { title: "1984", author: "George Orwell" },
      { title: "Animal", author: "Lisa Taddeo" },
    ],
  );

  assert.equal(result?.title, "Animal Farm");
  assert.equal(result?.author, "George Orwell");
});
