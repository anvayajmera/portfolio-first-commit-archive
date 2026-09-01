/* ============================================================================
   SITE COPY - every visible word lives here.
   ----------------------------------------------------------------------------
   Three islands, three jobs:

     identity  who this is, what he can do, what it looks like, how to reach him
     work      three builds worth reading about, and the record behind them
     journal   the writing, which is where the actual voice lives

   Written in first person and kept deliberately light on numbers. The full
   activity list has plenty of figures in it and they belong on an application
   form; a portfolio that leads with them reads as a CV with a 3D background.
   The numbers that survived are the ones that change what you think when you
   read them.

   Everything here is a draft to be rewritten in Anvay's own words. The
   structure is what matters: swap the strings, nothing else has to change.
   ========================================================================= */

export const PLACEHOLDER_COPY = true

export const SITE = {
  name: 'Anvay Ajmera',
  tagline: 'I build instruments, robots, and the odd flying thing.',
  email: 'anvayajmera9@gmail.com',
  url: 'https://example.com',
  description:
    'Anvay Ajmera builds low-cost scientific instruments, competition robots, and software, and teaches other students to do the same.',
} as const

/* --- Island 01: identity ---------------------------------------------------- */

export interface SkillGroup {
  label: string
  items: string[]
}

export interface GalleryItem {
  caption: string
  /** Drop a file in public/images and point at it. Empty renders a slot. */
  src?: string
}

export interface ContactLink {
  label: string
  value: string
  href?: string
  external?: boolean
}

export const IDENTITY = {
  eyebrow: 'Who I am',
  heading: 'I build instruments that make uncertain signals easier to trust.',
  lede: 'Draft. High school engineer in New Jersey. Most of what I do starts as a question I could not look up the answer to, and ends as a board, a robot, or a dataset.',
  body: [
    'Draft. I am happiest when a project has to survive contact with the real world. The interesting problems never show up in the CAD file. They show up during calibration, inside a housing that will not seal, next to a servo that is throwing noise into everything, or after a flight when the data finally comes back and does not look like the simulation.',
    'Draft. I also care a lot about who gets to build. A clear kit, a repaired laptop, and somebody willing to explain the thing twice changes who thinks engineering is for them. That is most of why I keep teaching it.',
  ],
  skills: [
    { label: 'Hardware', items: ['PCB design in KiCad', 'Analog front ends', 'Low-noise measurement', 'Thermal and enclosure design', 'Fabrication and machining'] },
    { label: 'Firmware and software', items: ['C and C++ on STM32 and ESP32', 'Python for analysis', 'OpenCV', 'Full-stack web', 'Control and PID tuning'] },
    { label: 'Working with people', items: ['Teaching and curriculum', 'Running a hackathon', 'Leading a competition team', 'Speaking to non-engineers'] },
  ] satisfies SkillGroup[],
  /* Empty `src` renders an empty frame rather than a broken image, so the
     layout can be judged before the photographs exist. */
  gallery: [
    { caption: 'Bench, mid-build', src: undefined },
    { caption: 'Board bring-up', src: undefined },
    { caption: 'Competition robot', src: undefined },
    { caption: 'From the air', src: undefined },
  ] satisfies GalleryItem[],
  contactLede: 'The fastest way to reach me is email. I answer.',
  links: [
    { label: 'Email', value: SITE.email, href: `mailto:${SITE.email}` },
    { label: 'GitHub', value: 'Add your handle', external: true },
    { label: 'LinkedIn', value: 'Add your profile', external: true },
    // Add href: '/documents/resume.pdf' once the file is in public/documents.
    { label: 'Résumé', value: 'Ask me and I will send it over' },
  ] satisfies ContactLink[],
} as const

/* --- Island 02: work -------------------------------------------------------- */

export interface ProjectSection {
  label: string
  text: string
}

export interface Project {
  id: string
  title: string
  category: string
  year: string
  status: string
  summary: string
  question: string
  sections: ProjectSection[]
  tags: string[]
  accent: string
  icon: 'detector' | 'robot' | 'software'
  attachments: { label: string; href?: string }[]
}

/* Three, not eight. A reader who is going to look at one thing should land on
   the strongest one; a grid of eight guarantees they skim all of them. */
export const PROJECTS: Project[] = [
  {
    id: 'cosmicwatch',
    title: 'CosmicWatch detectors, and what came after',
    category: 'Instrumentation',
    year: '2024 to now',
    status: 'Ongoing at UD Sharp Lab',
    summary:
      'Draft. A sub-200 dollar muon detector I built for an independent research year, which turned into a paid role in a university particle physics lab and hardware headed for a 2027 satellite launch.',
    question: 'Can a high school student measure cosmic rays well enough for the numbers to mean anything?',
    sections: [
      { label: 'How it started', text: 'Draft. I built and modified MIT CosmicWatch detectors for a year-long AP Research study, then cold emailed my results to the person who designed them. That turned into a role at the University of Delaware Sharp Lab.' },
      { label: 'What I did there', text: 'Draft. A copper thermal mount for the detector board, CAD for an aluminium enclosure, and firmware for the flight version. I also helped build a twenty-detector array and worked on neutrino detection tubing.' },
      { label: 'Where it went', text: 'Draft. A paper through MIT URTC on IEEE Xplore, two more in review, and a payload flown to over 100,000 feet on a high-altitude balloon.' },
      { label: 'What I would do differently', text: 'Draft. Say the honest thing here. The version of this paragraph that admits what did not work is the one people remember.' },
    ],
    tags: ['Analog front end', 'Low noise', 'KiCad', 'Firmware', 'Python'],
    accent: '#C77745',
    icon: 'detector',
    attachments: [{ label: 'IEEE paper' }, { label: 'Balloon flight data' }],
  },
  {
    id: 'rescue-line',
    title: 'RoboCup Junior rescue robot',
    category: 'Competition robotics',
    year: '2025 to 2026',
    status: 'First place and best hardware design, RCJ USA',
    summary:
      'Draft. A nine-pound autonomous robot built from nothing: printed chassis, custom boards, a Jetson doing the thinking, and two vision models arguing about what the camera was seeing.',
    question: 'How much of a robot can one team actually build themselves before buying parts starts to cost more than it saves?',
    sections: [
      { label: 'The build', text: 'Draft. 3D-modelled and printed chassis, custom PCBs, NVIDIA Jetson control, two cameras running separate OpenCV models. Roughly 300 logged build hours across the season.' },
      { label: 'The problem that ate a month', text: 'Draft. Electrical noise from the servos was corrupting sensor reads. We found it by trial and error and solved it with low-cost aluminium shielding we cut ourselves.' },
      { label: 'The team', text: 'Draft. We kept a running list called happy mistakes. Most of what we learned is on it.' },
    ],
    tags: ['Jetson', 'OpenCV', 'Custom PCB', 'CAD', 'Team lead'],
    accent: '#137C8B',
    icon: 'robot',
    attachments: [{ label: 'Build journal' }, { label: 'Competition footage' }],
  },
  {
    id: 'panthertrack',
    title: 'PantherTrack',
    category: 'Full-stack software',
    year: '2026',
    status: 'National champion, FBLA website coding',
    summary:
      'Draft. A lost-and-found system for my school that matches photos of found items against reported ones, then issues a QR receipt at pickup. It is in real use, which is the part I care about.',
    question: 'Why does every school lost-and-found lose more than it finds?',
    sections: [
      { label: 'How it works', text: 'Draft. DINOv2 image embeddings for matching, QR-code pickup receipts, Flask and SQLite behind it. About 180 hours of build time.' },
      { label: 'Why it is not a demo', text: 'Draft. It runs in the BRHS lost-and-found with real items logged. Building for actual users changes every decision you make.' },
      { label: 'The competition part', text: 'Draft. Seven-minute presentation to technical judges on a 220-point rubric, competing solo in a team event. First nationally.' },
    ],
    tags: ['DINOv2', 'Flask', 'SQLite', 'Product design'],
    accent: '#4C6EA8',
    icon: 'software',
    attachments: [{ label: 'Live site' }, { label: 'Source' }],
  },
]

export interface Award {
  year: string
  title: string
  detail: string
}

export const AWARDS: Award[] = [
  { year: '2026', title: 'FBLA National Champion, Website Coding and Development', detail: 'First nationally, competing solo in a team event.' },
  { year: '2026', title: 'RoboCup Junior USA, first place and best hardware design', detail: 'Rescue Line.' },
  { year: '2025', title: 'AMD and Hack Club Open Robotics Hackathon, fifth', detail: 'Twenty finalist teams from over 25,000 entrants. Shown at CES 2026.' },
  { year: '2025', title: 'Congressional Award, Gold Medal', detail: 'Two years of service, personal development, fitness, and an expedition.' },
  { year: '2025', title: 'United Nations STI Forum speaker', detail: 'Main-session talk on the digital divide, as a youth and NGO representative.' },
  { year: '2025', title: "Governor's STEM Scholars, New Jersey", detail: 'One of about 100 selected statewide.' },
  { year: '2024', title: 'MIT BeaverWorks, microelectronics and hardware', detail: 'Selective summer institute taught by Draper and MIT.nano staff.' },
]

export const WORK_PANEL = {
  eyebrow: 'Work',
  heading: 'Three builds, and the record behind them.',
  lede: 'Draft. Pick one. Each has the question it started from, what actually happened, and what I would do differently.',
} as const

/* --- Island 03: journal ------------------------------------------------------ */

export interface JournalEntry {
  id: string
  title: string
  date: string
  kind: string
  standfirst: string
  body: string[]
}

export const JOURNAL_PANEL = {
  eyebrow: 'Journal',
  heading: 'Things I have been thinking about.',
  lede: 'Draft. Longer writing that does not belong on a project page. This is the part I would rather you read.',
} as const

export const JOURNAL: JournalEntry[] = [
  {
    id: 'cold-email',
    title: 'On sending the cold email',
    date: 'Draft date',
    kind: 'Essay',
    standfirst: 'Draft. The single highest-return thing I have done, and how badly I expected it to go.',
    body: [
      'Draft. Write the version of this that admits you nearly did not send it. That is the part another student needs to read.',
      'Draft. What happened after, and what you would tell someone drafting theirs.',
    ],
  },
  {
    id: 'failed-seals',
    title: 'Three submarine seals that did not hold',
    date: 'Draft date',
    kind: 'Field notes',
    standfirst: 'Draft. A build that failed in the same way three times before it worked, and what the third failure finally taught me.',
    body: [
      'Draft. The design, the failure, the diagnosis, the fix. Keep the parts where you were wrong.',
      'Draft. Why waterproofing is a different discipline to the rest of it.',
    ],
  },
  {
    id: 'teaching',
    title: 'What teaching electronics taught me about explaining things',
    date: 'Draft date',
    kind: 'Essay',
    standfirst: 'Draft. On kits, repaired laptops, and how quickly someone decides engineering is not for them.',
    body: [
      'Draft. Enginuity, the hackathon, the workshops. Specific students, not counts.',
      'Draft. What you got wrong at the start about how to teach it.',
    ],
  },
  {
    id: 'riding',
    title: 'Falling with style',
    date: 'Draft date',
    kind: 'Off the bench',
    standfirst: 'Draft. Racing mountain bikes badly, on purpose, and what it has to do with engineering.',
    body: [
      'Draft. No podiums. Fourteen trails. Why you keep going.',
      'Draft. The bit about recovering after a crash generalising to everything else.',
    ],
  },
]
