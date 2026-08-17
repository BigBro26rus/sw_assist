export interface CharacterSummary {
  uuid: string;
  name: string;
  created: number;
}

export interface CharacterData {
  uuid: string;
  concept: {
    name: string;
    description: string;
  };
  [key: string]: unknown;
}
