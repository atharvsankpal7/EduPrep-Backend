import { createHash } from 'crypto';

export interface ShuffleResult {
    shuffledOptions: string[];
    newAnswerIndex: number; // 1-based index in shuffled array
    indexMap: number[]; // shuffledIndex -> originalIndex (0-based)
}

export function shuffleOptions(options: string[], correctIndex: number, seed?: string): ShuffleResult {
    // correctIndex is 1-based, we'll work with 0-based for array operations and convert back
    const indices = options.map((_, i) => i);

    if (seed) {
        // Deterministic shuffle
        const hash = createHash('sha256').update(seed).digest('hex');
        // Use a simple seeded PRNG logic based on the hash
        let seedValue = parseInt(hash.substring(0, 8), 16);

        const random = () => {
            const x = Math.sin(seedValue++) * 10000;
            return x - Math.floor(x);
        };

        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
    } else {
        // Random shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
    }

    const shuffledOptions = indices.map(i => options[i]);

    // correctIndex - 1 is the 0-based index of the correct answer in the original array.
    // We want to find where it moved to.
    // indices[k] is the original index at position k.
    // So we look for k such that indices[k] == correctIndex - 1.
    const newAnswerZeroBased = indices.indexOf(correctIndex - 1);

    return {
        shuffledOptions,
        newAnswerIndex: newAnswerZeroBased + 1,
        indexMap: indices
    };
}
