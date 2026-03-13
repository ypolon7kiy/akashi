Most reviews of prompt‑management extensions in VS Code are still early‑stage and mixed: users like having prompts close to code, but complain about weak editing UX, poor discoverability, and limited repo‑level structure.

What users like
Prompts stored near code: Developers appreciate tools like Prompty and custom prompt‑file extensions because prompts live in the repo, under version control, and can be edited like normal code.

Playground and fast iteration: Users value being able to run and tweak prompts directly in VS Code (preview panes, “run prompty”, quick experiments) instead of copy‑pasting into web UIs.

Organization and reuse: Features such as folders, search, and quick copy/insert for prompt libraries (e.g., Prompt Manager, Nice Prompt, Gately) are seen as helpful when prompts start to accumulate.

Pain points and complaints
Editing limitations across surfaces: In multi‑surface tools (web + VS Code + browser), users complain that some clients only allow saving but not editing prompts (e.g., Chrome extension only “save”, must edit in web or VS Code).
​

Basic CRUD UX: Simple operations like editing, renaming, or organizing prompts are sometimes clunky or missing; users expect standard snippet‑manager quality here and are annoyed when it is not present.

Low discoverability / navigation: Prompt lists without good search, tags, or structure become hard to navigate as libraries grow; marketplace descriptions emphasize search and categories because this has been a pain point.

Coupling to one workflow: Some tools are tied closely to a single workflow (e.g., Copilot chat attachment, feedback‑centric flows), which makes them feel less useful as general prompt/guideline managers.

Positive patterns that resonate
Tree views / sidebars: Extensions that expose prompts in a tree view or dedicated activity‑bar item (Prompt Manager, AI Feedback) match how developers think about project assets.

Rich preview: Markdown‑like or template previews while typing (Prompty preview) are highlighted as making prompt engineering “much more efficient” and “user‑friendly”.

Centralization & version control: Reviews of Prompty stress the benefit of centralizing prompts in YAML/asset files under Git, with team collaboration and CI/testing support.

Gaps your extension can target
Repo‑wide structure, not just lists: Existing tools mostly manage prompts as a flat library; users do not yet have good UX for understanding how multiple guideline files relate across a codebase.

Guidelines‑aware editing: There is almost no review feedback about conflict detection, inheritance, or composition of instructions, implying that these features are largely missing rather than disliked.

Consistent editing across surfaces: Users explicitly notice when editing capabilities differ between VS Code, browser, and web UIs; a “single, consistent editor” for guidelines inside VS Code would address a known irritation.
​

Design takeaways for your product
Make basic CRUD rock‑solid: inline editing, rename, tags, search, and folders should feel like working with code snippets.

Add strong visualization/preview: show the final composed prompt/guidelines an agent will see, with a live preview and diff as files change.

Lean into repo‑level understanding: offer views that no current prompt manager has—such as guideline graphs, inheritance, and “what instructions apply here?” for a given folder/file. This directly responds to the absence of such features in existing reviews.

