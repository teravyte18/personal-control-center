/*
 * Personal Control Center — one-off Amazon book import
 *
 * Run this while logged into the app:
 * 1. Open the app on desktop.
 * 2. Open Developer Tools (F12) and select Console.
 * 3. Paste this entire file and press Enter.
 * 4. Review the duplicate/new-book summary and confirm.
 *
 * The script adds only missing books as Unread + Wishlist. It matches existing
 * Library records by a normalized title (and title base/author where useful).
 * It is safe to rerun after an interruption: books already added are skipped.
 */

(async () => {
  const books = [
    ["The Theory of Moral Sentiments: The Philosophy of Ethics in Smith's Economic Theory", "Adam Smith"],
    ["Tito and His Comrades", "Jože Pirjevec"],
    ["Excellent Sheep: The Miseducation of the American Elite and the Way to a Meaningful Life", "William Deresiewicz"],
    ["Flow: The Psychology of Optimal Experience", "Mihaly Csikszentmihalyi"],
    ["Unfiltered: My Incredible Decade in Formula 1", "Guenther Steiner"],
    ["Et la joie de vivre", "Gisèle Pelicot"],
    ["Little, Big", "John Crowley"],
    ["Total Recall: My Unbelievably True Life Story", "Arnold Schwarzenegger"],
    ["The Rig Veda: Complete", "Ralph T.H. Griffith"],
    ["The World as I See It", "Albert Einstein"],
    ["One Hundred Years of Solitude", "Gabriel Garcia Marquez"],
    ["The Divine Comedy", "Dante Alighieri"],
    ["The Magician's Nephew", "C. S. Lewis"],
    ["Antifragile: Things That Gain from Disorder", "Nassim Nicholas Taleb"],
    ["The Bell Curve: Intelligence and Class Structure in American Life", "Richard J. Herrnstein"],
    ["The Odyssey", "Homer"],
    ["The Epic of Gilgamesh", "Anonymous"],
    ["The Courage to Be Happy: Discover the Power of Positive Psychology and Choose Happiness Every Day", "Ichiro Kishimi"],
    ["The Courage to Be Disliked: The Japanese Phenomenon That Shows You How to Change Your Life and Achieve Real Happiness", "Ichiro Kishimi"],
    ["Dopamine Nation: Finding Balance in the Age of Indulgence", "Anna Lembke"],
    ["Prisoner's Dilemma: John von Neumann, Game Theory, and the Puzzle of the Bomb", "William Poundstone"],
    ["Theory of Games and Economic Behavior", "John von Neumann"],
    ["Thinking, Fast and Slow", "Daniel Kahneman"],
    ["Shōgun, Part One", "James Clavell"],
    ["Tokyo Vice: An American Reporter on the Police Beat in Japan", "Jake Adelstein"],
    ["The Hard Thing About Hard Things: Building a Business When There Are No Easy Answers", "Ben Horowitz"],
    ["The Orphic Argonautica", "Jason Colavito"],
    ["The Orphic Hymns", "Apostolos N. Athanassakis"],
    ["Theogony and Works and Days", "Hesiod"],
    ["12 Rules for Life: An Antidote to Chaos", "Jordan B. Peterson"],
    ["Zero to Production in Rust: An Introduction to Backend Development", "Luca Palmieri"],
    ["Individualism and Economic Order", "F. A. Hayek"],
    ["Animal Farm", "George Orwell"],
    ["Capital: A Critique of Political Economy, Volume 1", "Karl Marx"],
    ["The Prince", "Niccolò Machiavelli"],
    ["War and Peace", "Leo Tolstoy"],
    ["Bhagavad Gita: The Authentic English Translation for Accurate and Unbiased Understanding", "Hari Chetan"],
    ["The Holy Quran: English Translation of The Noble Qur'an", "Marmaduke Pickthall"],
    ["The Book of Enoch", "Thomas R"],
    ["Start with Why: How Great Leaders Inspire Everyone to Take Action", "Simon Sinek"],
    ["Elon Musk", "Walter Isaacson"],
    ["Guns, Germs, and Steel: The Fates of Human Societies", "Jared Diamond"],
    ["Great Expectations", "Charles Dickens"],
    ["A Brief History of Time", "Stephen Hawking"],
    ["Atomic Habits: An Easy & Proven Way to Build Good Habits & Break Bad Ones", "James Clear"],
    ["Perspective Made Easy", "Ernest R. Norling"],
    ["The Occupation of Planet Earth: A Liberation Manual", "Peter"],
    ["Ikigai: The Japanese Secret to a Long and Happy Life", "Héctor García"],
    ["Meditations", "Marcus Aurelius"],
    ["Chip War: The Fight for the World's Most Critical Technology", "Chris Miller"],
    ["Outliers: The Story of Success", "Malcolm Gladwell"],
    ["The Innovator's Dilemma: When New Technologies Cause Great Firms to Fail", "Clayton M. Christensen"],
    ["The Tipping Point: How Little Things Can Make a Big Difference", "Malcolm Gladwell"],
    ["Common Sense on Mutual Funds", "John C. Bogle"],
    ["Churchill: A Life", "Martin Gilbert"],
    ["The 48 Laws of Power", "Robert Greene"],
    ["Pessoa: A Biography", "Richard Zenith"],
  ].map(([title, author]) => ({ title, author }));

  const BOOK_PREFIXES = ["__pcc_book_v1__\n", "__pcc_book_v2__\n"];

  const normalize = (value) => value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  const titleBase = (value) => normalize(value.split(/[:|(]/, 1)[0]);

  const parseExistingBook = (item) => {
    const prefix = BOOK_PREFIXES.find((candidate) => item.description?.startsWith(candidate));
    if (item.kind !== "note" || !prefix) return null;
    try {
      const details = JSON.parse(item.description.slice(prefix.length));
      return {
        title: item.title,
        author: typeof details.author === "string" ? details.author : "",
      };
    } catch {
      return null;
    }
  };

  const stateResponse = await fetch("/api/personal-data", { cache: "no-store" });
  if (!stateResponse.ok) {
    throw new Error("Could not read your Personal Control Center data. Make sure you are logged in.");
  }

  const state = await stateResponse.json();
  const existingBooks = (state.snapshot?.items ?? []).flatMap((item) => {
    const book = parseExistingBook(item);
    return book ? [book] : [];
  });

  const matchesExisting = (candidate) => existingBooks.some((existing) => {
    if (normalize(existing.title) === normalize(candidate.title)) return true;
    const sameBase = titleBase(existing.title) === titleBase(candidate.title);
    if (!sameBase || titleBase(candidate.title).length < 5) return false;
    const existingAuthor = normalize(existing.author);
    const candidateAuthor = normalize(candidate.author);
    return !existingAuthor || !candidateAuthor || existingAuthor === candidateAuthor;
  });

  const seenInput = new Set();
  const toAdd = [];
  const skipped = [];

  for (const book of books) {
    const key = normalize(book.title);
    if (seenInput.has(key) || matchesExisting(book)) {
      skipped.push(book);
      continue;
    }
    seenInput.add(key);
    toAdd.push(book);
  }

  console.table(skipped.map(({ title, author }) => ({ result: "Skipped existing", title, author })));
  console.table(toAdd.map(({ title, author }) => ({ result: "Will add", title, author })));

  if (!toAdd.length) {
    alert("All 57 books are already in your Library. Nothing was changed.");
    return;
  }

  const confirmed = confirm(
    `Found ${books.length} cart books. ${skipped.length} match existing Library records; ${toAdd.length} will be added as Unread + Wishlist. Continue?`,
  );
  if (!confirmed) return;

  const descriptionFor = (author) => `__pcc_book_v2__\n${JSON.stringify({
    author,
    editionNote: "",
    readingState: "unread",
    ownership: "wishlist",
    priority: "none",
    startDate: "",
    finishDate: "",
    thoughts: "",
    coverId: "",
    upNextOrder: 0,
    ratings: {},
  })}`;

  let added = 0;
  for (const book of toAdd) {
    const timestamp = new Date().toISOString();
    const response = await fetch("/api/personal-data/mutations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "add-item",
        item: {
          id: crypto.randomUUID(),
          title: book.title,
          description: descriptionFor(book.author),
          actions: [],
          kind: "note",
          status: "active",
          area: "personal",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(
        `Stopped after adding ${added} books: ${body.error || `request failed with status ${response.status}`}. Rerun the script to resume safely.`,
      );
    }
    added += 1;
  }

  alert(`Added ${added} books. Skipped ${skipped.length} existing matches. The Library will now reload.`);
  location.reload();
})().catch((error) => {
  console.error(error);
  alert(error instanceof Error ? error.message : "The book import failed.");
});
