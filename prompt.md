You are given a list of GitHub pull requests grouped by repository.
Reformat the README.md with the following structure:

1. Each repo gets a `### repo/name` heading
2. Under each repo, PRs are split into subsections:
   - `#### Highlights` — important PRs at the top
   - `#### Less` — add less important PRs
3. Within each subsection, order PRs by importance (most impactful first).
4. Do not delete any pull requst.
