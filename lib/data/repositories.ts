import { LocalEntryRepository } from "@/lib/data/local/local-entry-repository";
import { LocalTrackerRepository } from "@/lib/data/local/local-tracker-repository";
import { LocalUserRepository } from "@/lib/data/local/local-user-repository";
import type {
  EntryRepository,
  TrackerRepository,
  UserRepository,
} from "@/lib/data/repositories/types";

export interface RepositoryContainer {
  users: UserRepository;
  trackers: TrackerRepository;
  entries: EntryRepository;
}

let container: RepositoryContainer | null = null;

export function getRepositories(): RepositoryContainer {
  if (!container) {
    container = {
      users: new LocalUserRepository(),
      trackers: new LocalTrackerRepository(),
      entries: new LocalEntryRepository(),
    };
  }
  return container;
}
