import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";

export const useContactsSearch = (query: string, delayMs = 200) => {
  const [debounced, setDebounced] = useState(query);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(query), delayMs);
    return () => clearTimeout(id);
  }, [query, delayMs]);

  return useQuery(api.contacts.queries.searchUsers, { query: debounced });
};
