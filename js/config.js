/**
 * Application configuration and assessment data
 * MorningRoutineTracker — ADHD Awareness & Morning Routine Tracker
 */

const APP_CONFIG = {
  studentName: 'A Sri Nidhi',
  studentClass: 'Grade VIII,',
  school: 'Amrita Vidyalayam, Thuckalay',
  project: 'INSPIRE MANAK',
  disclaimer:
    'This assessment is intended for educational awareness only. It cannot diagnose ADHD. Please consult a qualified healthcare professional for a comprehensive evaluation.',
};

/**
 * Assessment questions grouped by section.
 *   Section A — Inattention     : Q1–Q9   (9 questions)
 *   Section B — Hyperactivity   : Q10–Q15 (6 questions)
 *   Section C — Impulsivity      : Q16–Q18 (3 questions)
 *
 * These are adapted, parent-friendly Yes/No questions. They are NOT the official
 * AIIMS INDT-ADHD tool, are not clinically validated, and cannot diagnose ADHD.
 */
const ASSESSMENT_QUESTIONS = [
  {
    section: 'A',
    sectionTitle: 'Inattention',
    description: 'These questions help parents observe difficulties with attention, concentration, organisation and memory.',
    items: [
      "Does your child often miss details or make careless mistakes in schoolwork or other activities?",
      "Does your child often find it difficult to concentrate on homework, lessons, conversations or games?",
      "Does your child often seem not to listen when spoken to directly?",
      "Does your child often have difficulty following instructions and completing tasks?",
      "Does your child often find it difficult to organise tasks, materials or activities?",
      "Does your child often avoid or delay tasks that require sustained mental effort, such as homework?",
      "Does your child often lose things needed for tasks, such as books, pencils or school materials?",
      "Is your child often easily distracted by sounds, movement or other things happening nearby?",
      "Does your child often forget everyday activities or responsibilities?",
    ],
  },
  {
    section: 'B',
    sectionTitle: 'Hyperactivity',
    description: 'These questions help parents observe excessive movement, restlessness and difficulty staying quiet.',
    items: [
      "Does your child often fidget with their hands or feet, or squirm while seated?",
      "Does your child often leave their seat when expected to remain seated?",
      "Does your child often run around or climb when it is not appropriate?",
      "Does your child often find it difficult to play or take part in activities quietly?",
      "Does your child often seem constantly on the go, as if driven by a motor?",
      "Does your child often talk excessively?",
    ],
  },
  {
    section: 'C',
    sectionTitle: 'Impulsivity',
    description: 'These questions help parents observe difficulty waiting, controlling responses and interrupting others.',
    items: [
      "Does your child often call out answers before a question has been completed?",
      "Does your child often find it difficult to wait for their turn?",
      "Does your child often interrupt or intrude on other people's conversations or activities?",
    ],
  },
];

/** Total number of assessment questions (derived from the data above). */
const TOTAL_QUESTIONS = ASSESSMENT_QUESTIONS.reduce((n, g) => n + g.items.length, 0);

/** Yes/No response options used for the parent-friendly questionnaire. */
const RESPONSE_OPTIONS = [
  { label: 'Yes', value: 'yes' },
  { label: 'No',  value: 'no'  },
];

/* ────────────────────────────────────────────────────────────────────────────
   Results-page content (parent-friendly, non-diagnostic)
   ──────────────────────────────────────────────────────────────────────────── */

/** AIIMS INDT-ADHD training module used as a clinical reference only. */
const AIIMS_REFERENCE_URL =
  'https://pedneuroaiims.org/training_module_for_attention_deficit_hyperactivity_disorder.html';

/** Prominent medical disclaimer shown on the results page and PDF report. */
const MEDICAL_DISCLAIMER =
  'This questionnaire is intended for awareness and preliminary observation only. ' +
  'It is not a medical diagnostic tool and cannot confirm or rule out ADHD. ' +
  'A qualified healthcare professional must conduct a comprehensive evaluation before any diagnosis or treatment decision is made.';

/** Parent-friendly explanation of what the responses do and do not mean. */
const UNDERSTANDING_RESULTS_TEXT = [
  'Your responses provide an overview of behaviours related to attention, hyperactivity and impulsivity.',
  'These observations can help you understand your child\u2019s behaviour and identify areas you may wish to discuss with a healthcare professional.',
  'The number of Yes responses alone cannot determine whether a child has ADHD. A proper evaluation requires consideration of several factors, including how long the behaviours have been present, the child\u2019s developmental history, their impact on everyday functioning, and whether they occur in different settings.',
];

/** Supportive, non-judgmental next steps for parents. */
const PARENT_NEXT_STEPS = [
  { icon: 'fa-eye',              text: 'Observe your child\u2019s behaviour in everyday activities.' },
  { icon: 'fa-heart',            text: 'Encourage your child positively rather than scolding them.' },
  { icon: 'fa-user-doctor',      text: 'Discuss any concerns with a qualified paediatrician or child mental health professional.' },
  { icon: 'fa-clipboard-list',   text: 'Seek a comprehensive evaluation if you are concerned about your child\u2019s attention, activity level or impulse control.' },
];

/**
 * Important rules about the AIIMS reference. These keep the website honest about
 * what the questionnaire is and is not. Rendered verbatim on the results page.
 */
const AIIMS_REFERENCE_NOTES = [
  'This website uses adapted parent-friendly Yes/No questions. It is not the official AIIMS INDT-ADHD tool.',
  'The questionnaire is not clinically validated.',
  'Reaching a response threshold (such as 6 out of 9) is a prompt to seek professional evaluation \u2014 not an automatic diagnosis or a confirmation of ADHD.',
  'The child is not classified as ADHD, non-ADHD, mild, moderate or severe.',
  'No diagnostic risk categories (such as mild, moderate or severe) are created from the response counts.',
  'A threshold-based advisory encourages consulting a professional; it is not a medical diagnosis or a treatment recommendation.',
  'DSM-IV and DSM-5 diagnostic criteria are not mixed.',
  'The response percentage is not presented as an ADHD probability or severity score.',
];

/**
 * Screening thresholds that prompt parents to seek professional attention.
 * These are NOT diagnostic cutoffs — they are prompts to consult a professional.
 *   Inattention (Section A, 9 questions): 6 or more "Yes" responses
 *   Combined Hyperactivity + Impulsivity (Sections B + C, 9 questions): more than 6 "Yes"
 */
const SEEK_ATTENTION_THRESHOLDS = {
  inattention: { count: 6, compare: '>=', label: '6 or more out of 9' },
  combined:    { count: 6, compare: '>',  label: 'more than 6 out of 9' },
};

/** Advisory text shown when a screening threshold is met. */
const SEEK_ATTENTION_ADVISORY = {
  inattention: 'Your child received 6 or more \u201cYes\u201d responses in the Inattention section. This meets a commonly used screening threshold. You may wish to discuss these observations with a qualified paediatrician or child mental health professional.',
  combined: 'Your child received more than 6 \u201cYes\u201d responses across the Hyperactivity and Impulsivity sections combined. This meets a commonly used screening threshold. You may wish to discuss these observations with a qualified paediatrician or child mental health professional.',
  note: 'This is a prompt to seek professional evaluation \u2014 not a diagnosis. Only a qualified healthcare professional can determine whether your child has ADHD.',
};

/** Morning routine checklist items (used in Recommendations section) */
const MORNING_ROUTINE_ITEMS = [
  'Brush teeth',
  'Wear uniform',
  'Breakfast',
  'Pack bag',
  'Homework',
  'Water bottle',
  'Shoes',
  'Leave on time',
];

/** Parent tips carousel */
const PARENT_TIPS = [
  { icon: 'fa-star',          title: 'Praise Effort',           text: 'Focus on effort and progress rather than perfection. Celebrate small wins to build confidence and motivation.' },
  { icon: 'fa-heart',         title: 'Avoid Punishment',        text: 'Use positive guidance instead of punishment. ADHD-related behaviours are not intentional misbehaviour.' },
  { icon: 'fa-moon',          title: 'Good Sleep',              text: 'Ensure 9–11 hours of sleep for children. A consistent bedtime routine improves focus the next day.' },
  { icon: 'fa-apple-whole',   title: 'Healthy Breakfast',       text: 'A balanced breakfast with protein helps sustain attention and energy throughout the school day.' },
  { icon: 'fa-bag-shopping',  title: 'Prepare Previous Night',  text: 'Pack bags, lay out uniforms, and review schedules the night before to reduce morning stress.' },
];

/** Teacher tips carousel */
const TEACHER_TIPS = [
  { icon: 'fa-chair',             title: 'Front Row Seating',         text: 'Seat the student near the teacher to minimise distractions and provide gentle reminders.' },
  { icon: 'fa-pen-to-square',     title: 'Written Instructions',      text: 'Provide step-by-step written instructions alongside verbal directions for clarity.' },
  { icon: 'fa-person-walking',    title: 'Movement Breaks',           text: 'Allow brief movement breaks between tasks to help release excess energy productively.' },
  { icon: 'fa-list-check',        title: 'Short Assignments',         text: 'Break large tasks into smaller, manageable chunks with clear deadlines.' },
  { icon: 'fa-thumbs-up',         title: 'Positive Feedback',         text: 'Offer immediate, specific praise when the student demonstrates focus or completes tasks.' },
  { icon: 'fa-calendar-days',     title: 'Visual Classroom Schedule', text: 'Display a visual daily schedule so students know what to expect throughout the day.' },
];

/** External reference links */
const REFERENCES = [
  { title: 'AIIMS ADHD Training Module', url: 'https://www.aiims.edu/index.php/hi/neurology_introdu',                                               icon: 'fa-hospital',      desc: 'All India Institute of Medical Sciences resources on ADHD awareness.' },
  { title: 'CDC ADHD',                   url: 'https://www.cdc.gov/adhd/',                                                   icon: 'fa-globe',         desc: 'Centers for Disease Control and Prevention ADHD information.' },
  { title: 'NIMH',                       url: 'https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd', icon: 'fa-brain', desc: 'National Institute of Mental Health ADHD overview.' },
  { title: 'Indian ADHD Research',       url: 'https://pubmed.ncbi.nlm.nih.gov/?term=ADHD+India+children',                  icon: 'fa-book-medical',  desc: 'Published research on ADHD prevalence in Indian children.' },
];

/** Inattentive profile recommendations */
const INATTENTIVE_RECOMMENDATIONS = [
  { icon: 'fa-calendar-check',  title: 'Visual Schedules',       text: 'Use picture or written schedules for daily routines at home and school.' },
  { icon: 'fa-clipboard-list',  title: 'Morning Checklist',      text: 'Post a laminated morning checklist in the bedroom or kitchen.' },
  { icon: 'fa-clock',           title: 'Timers',                 text: 'Use visual timers to help with task transitions and time awareness.' },
  { icon: 'fa-book-open',       title: 'Break Homework',         text: 'Divide homework into 15–20 minute blocks with short breaks between.' },
  { icon: 'fa-backpack',        title: 'Night-Before School Bag',text: 'Pack the school bag every evening to avoid morning rush and forgotten items.' },
  { icon: 'fa-palette',         title: 'Colour-Coded Notebooks', text: 'Assign a colour to each subject for easy organisation.' },
];

/** Hyperactive profile recommendations */
const HYPERACTIVE_RECOMMENDATIONS = [
  { icon: 'fa-person-running', title: 'Movement Breaks',       text: 'Schedule regular movement breaks during study and classroom time.' },
  { icon: 'fa-dumbbell',       title: 'Physical Activity',     text: 'Encourage daily sports, yoga, or outdoor play to channel energy positively.' },
  { icon: 'fa-hourglass-half', title: 'Short Study Sessions',  text: 'Keep study periods brief and engaging to maintain focus.' },
  { icon: 'fa-hands',          title: 'Hands-On Learning',     text: 'Use manipulatives, experiments, and interactive activities when possible.' },
  { icon: 'fa-medal',          title: 'Positive Reinforcement',text: 'Reward desired behaviours with praise, stickers, or small privileges.' },
];

// ── CommonJS export for the Node test runner (no effect in the browser) ──
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    APP_CONFIG,
    ASSESSMENT_QUESTIONS,
    TOTAL_QUESTIONS,
    RESPONSE_OPTIONS,
    AIIMS_REFERENCE_URL,
    MEDICAL_DISCLAIMER,
    UNDERSTANDING_RESULTS_TEXT,
    PARENT_NEXT_STEPS,
    AIIMS_REFERENCE_NOTES,
    SEEK_ATTENTION_THRESHOLDS,
    SEEK_ATTENTION_ADVISORY,
  };
}
