interface Character {
  name: string;
  description: string;
  locked: boolean;
}

export default function CharacterCard({ character }: { character: Character }) {
  return (
    <div className="border rounded p-4">
      <h3 className="font-bold text-lg">{character.name}</h3>

      <p className="text-sm text-gray-600 mt-2">
        {character.description}
      </p>

      <div className="mt-3">
        {character.locked ? (
          <span className="text-green-600 text-sm">🔒 Locked</span>
        ) : (
          <span className="text-red-600 text-sm">Unlocked</span>
        )}
      </div>
    </div>
  );
}
