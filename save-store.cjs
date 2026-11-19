const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_SNAPSHOT_BYTES = 2 * 1024 * 1024;
const filenames = ['spielstand-1.json', 'spielstand-2.json'];

function digest(generation, data) {
  return createHash('sha256').update(`${generation}:\n${data}`).digest('hex');
}

function createSaveStore(directory) {
  const files = filenames.map((filename) => path.join(directory, filename));

  function readSlot(file, index) {
    try {
      if (fs.statSync(file).size > 2 * MAX_SNAPSHOT_BYTES + 512) return null;
      const { generation, data, checksum } = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Number.isSafeInteger(generation) || generation < 1 || typeof data !== 'string') return null;
      if (digest(generation, data) !== checksum) return null;
      const snapshot = JSON.parse(data);
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
      return { index, generation, data, snapshot };
    } catch {
      return null;
    }
  }

  function latest() {
    const [first, second] = files.map(readSlot);
    if (!first) return second;
    return second && second.generation > first.generation ? second : first;
  }

  return {
    load() {
      return latest()?.snapshot ?? null;
    },

    save(snapshot) {
      if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return false;
      try {
        const data = JSON.stringify(snapshot);
        if (Buffer.byteLength(data, 'utf8') > MAX_SNAPSHOT_BYTES) return false;
        const previous = latest();
        if (previous?.data === data) return true;

        // Replace the older or damaged slot only after the new data is durable.
        const generation = (previous?.generation ?? 0) + 1;
        if (!Number.isSafeInteger(generation)) return false;
        const file = files[previous ? 1 - previous.index : 0];
        const temporary = `${file}.tmp`;
        const checksum = digest(generation, data);
        fs.mkdirSync(directory, { recursive: true });
        fs.writeFileSync(temporary, JSON.stringify({ generation, data, checksum }), { flush: true });
        fs.renameSync(temporary, file);
        return true;
      } catch (error) {
        console.error('Spielstand konnte nicht gespeichert werden:', error.message);
        return false;
      }
    }
  };
}

module.exports = { createSaveStore };
