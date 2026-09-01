export type RelationType = "Husband" | "Wife" | "Father" | "Other";
export type GenderType = "Male" | "Female";

export interface Voter {
  id: string;
  serialNo: string;
  epcNumber: string;
  voterName: string; // Devanagari
  relativeName: string; // Devanagari
  relation: RelationType;
  houseNo: string;
  age: number;
  gender: GenderType;
  needsReview?: boolean;
}

export interface ConstituencyMetadata {
  assemblyConstituency: string;
  partNumber: string;
  pollingStation: string;
}
