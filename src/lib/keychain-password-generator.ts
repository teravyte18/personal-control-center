export type KeychainPasswordGeneratorOptions = {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  numbers: boolean;
  symbols: boolean;
};

export const defaultKeychainPasswordGeneratorOptions: KeychainPasswordGeneratorOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
};

const alphabets = {
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{}:,.?",
} as const;

function randomIndex(maxExclusive: number) {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) throw new TypeError("Random range must be positive.");
  const range = 0x1_0000_0000;
  const ceiling = Math.floor(range / maxExclusive) * maxExclusive;
  const sample = new Uint32Array(1);
  do {
    globalThis.crypto.getRandomValues(sample);
  } while (sample[0] >= ceiling);
  return sample[0] % maxExclusive;
}

function randomCharacter(alphabet: string) {
  return alphabet[randomIndex(alphabet.length)];
}

export function generateKeychainPassword(options: KeychainPasswordGeneratorOptions) {
  if (!Number.isInteger(options.length) || options.length < 8 || options.length > 64) {
    throw new TypeError("Generated password length must be between 8 and 64 characters.");
  }

  const selected = (Object.keys(alphabets) as Array<keyof typeof alphabets>)
    .filter((key) => options[key]);
  if (selected.length === 0) throw new TypeError("Select at least one password character group.");
  if (options.length < selected.length) throw new TypeError("Password length is too short for the selected groups.");

  const combined = selected.map((key) => alphabets[key]).join("");
  const characters = selected.map((key) => randomCharacter(alphabets[key]));
  while (characters.length < options.length) characters.push(randomCharacter(combined));

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapWith = randomIndex(index + 1);
    [characters[index], characters[swapWith]] = [characters[swapWith], characters[index]];
  }

  return characters.join("");
}
