# Documents

Drop PDFs here. Anything in this folder is served from the site root, so
`public/documents/resume.pdf` is reachable at `/documents/resume.pdf`.

## Wiring a file up

Links are data, not markup. Open `src/content/site.content.ts` and add an
`href` to the entry you want to activate.

**Resume**, in the `CONTACT.links` array:

```ts
{ label: 'Résumé', value: 'PDF, one page', href: '/documents/resume.pdf' },
```

**Per project**, in that project's `attachments` array:

```ts
attachments: [
  { label: 'IEEE paper', href: '/documents/cosmicwatch-urtc.pdf' },
  { label: 'Build journal' },   // no href yet, renders greyed out
],
```

An attachment without an `href` renders in a disabled state rather than as a
dead link, which is why the slots are safe to leave in place until the files
actually exist.

## Naming

Lowercase, hyphens, no spaces. Spaces become `%20` in URLs and are a common
source of links that work locally and break once deployed.
