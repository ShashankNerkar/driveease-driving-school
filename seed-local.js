/**
 * DriveEase — One-Time Local Testing Seed Script
 *
 * Uses EXISTING HTTP APIs only. Does NOT:
 *   - modify any application source code
 *   - write directly to MongoDB
 *   - hard-code any credentials or secrets
 *   - create course-to-plan links (architecture does not support it)
 *   - create a ₹0 plan (amountPaise minimum is 100, i.e. ₹1)
 *
 * Prints CREATED / SKIPPED / FAILED for every operation.
 *
 * Run:
 *   node seed-local.js
 *
 * You will be prompted for admin email and password at runtime.
 * Make sure the DriveEase server is running on http://localhost:5000
 * before executing.
 */

'use strict';

const readline = require('node:readline');
const https    = require('node:https');
const http     = require('node:http');

// ── Config ────────────────────────────────────────────────────────────────
const BASE = 'http://localhost:5000/api';

// ── Minimal HTTP client (no extra dependencies) ───────────────────────────
/**
 * Perform an HTTP request.
 * @param {string} method
 * @param {string} path     - e.g. '/courses'
 * @param {object|null} body
 * @param {string|null} cookie - value of the Cookie header
 * @returns {Promise<{ status: number, body: object, cookies: string[] }>}
 */
function req(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url      = new URL(BASE + path);
    const payload  = body ? JSON.stringify(body) : null;
    const lib      = url.protocol === 'https:' ? https : http;

    const options = {
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload  ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...(cookie   ? { 'Cookie': cookie } : {}),
      },
    };

    const request = lib.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status:  res.statusCode,
            body:    JSON.parse(data),
            cookies: res.headers['set-cookie'] || [],
          });
        } catch {
          reject(new Error(`Non-JSON response from ${method} ${path}: ${data}`));
        }
      });
    });

    request.on('error', reject);
    if (payload) request.write(payload);
    request.end();
  });
}

// ── Prompt helper — reads from stdin without echoing password ─────────────
function prompt(question, silent = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input:  process.stdin,
      output: process.stdout,
    });

    if (silent && process.stdin.isTTY) {
      process.stdout.write(question);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      let pw = '';
      process.stdin.on('data', function handler(ch) {
        if (ch === '\n' || ch === '\r' || ch === '\u0003') {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdin.removeListener('data', handler);
          process.stdout.write('\n');
          rl.close();
          resolve(pw);
        } else if (ch === '\u007f') {
          pw = pw.slice(0, -1);
        } else {
          pw += ch;
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

// ── Status printer ────────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED    = '\x1b[31m';
const BOLD   = '\x1b[1m';
const CYAN   = '\x1b[36m';

function log(status, resource, detail = '') {
  const colour = status === 'CREATED' ? GREEN : status === 'SKIPPED' ? YELLOW : RED;
  const tag    = `${colour}${BOLD}[${status}]${RESET}`;
  console.log(`  ${tag} ${resource}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n${CYAN}${BOLD}── ${title} ──────────────────────────────────────${RESET}`);
}

// ── Cookie extractor ──────────────────────────────────────────────────────
function extractCookie(cookies, name) {
  for (const c of cookies) {
    const parts = c.split(';')[0].trim();
    if (parts.startsWith(`${name}=`)) {
      return parts.slice(name.length + 1);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// SEED DATA
// ═══════════════════════════════════════════════════════════════════════════

// ── Courses ───────────────────────────────────────────────────────────────
// Course 1 already exists (ID: 6a93bd766a071fe6eab25682).
// The script detects it by title and skips creation.
const COURSES = [
  {
    title:       'DriveEase Driving Basics',
    description: 'A solid foundation for first-time drivers. Learn vehicle controls, road safety fundamentals, and essential traffic rules in a structured one-week programme.',
    level:       'beginner',
    duration:    '1 week',
    status:      'published',
  },
  {
    title:       'DriveEase Road Ready',
    description: 'Take your driving skills to the next level. This two-week course covers traffic regulations, defensive driving, lane discipline, parking, and real-world road scenarios.',
    level:       'beginner',
    duration:    '2 weeks',
    status:      'published',
  },
  {
    title:       'DriveEase Pro Driving Mastery',
    description: 'Advanced four-week programme for confident drivers. Master highway driving, night visibility challenges, emergency handling, advanced parking, and comprehensive traffic risk management.',
    level:       'intermediate',
    duration:    '4 weeks',
    status:      'published',
  },
];

// ── Lessons per course title ──────────────────────────────────────────────
// Lesson 1 for "DriveEase Driving Basics" already exists (order 1).
// The script queries existing lessons per course and skips any (courseId+order) that already exist.
const LESSONS = {
  'DriveEase Driving Basics': [
    {
      order:       1,
      title:       'Introduction to Safe Driving',
      duration:    '20 minutes',
      description: 'An overview of what safe driving means, why it matters, and what this course will cover.',
      content:     'Safe driving begins before you start the engine. In this lesson we explore the mindset of a responsible driver: awareness of surroundings, anticipating hazards, and understanding that driving is a shared responsibility. We introduce the three pillars of safe driving — preparation, attention, and decision-making — and explain how they connect to every module in this course.',
    },
    {
      order:       2,
      title:       'Basic Vehicle Controls',
      duration:    '30 minutes',
      description: 'Hands-on walkthrough of steering, pedals, gear shifter, mirrors, and dashboard instruments.',
      content:     'Before moving on to road situations, every driver must be completely comfortable with vehicle controls. This lesson covers: steering wheel grip and input technique, clutch-brake-accelerator coordination for manual transmission, automatic gear selector positions (P R N D), mirror adjustment for maximum visibility, dashboard warning lights and their meanings, and the pre-drive checklist every driver should follow.',
    },
    {
      order:       3,
      title:       'Traffic Signs',
      duration:    '25 minutes',
      description: 'Recognition and meaning of mandatory, cautionary, and informatory road signs used in India.',
      content:     'Indian roads use three categories of signs. Mandatory signs (round, red border) indicate rules you must follow — stop, no entry, speed limits. Cautionary signs (triangular, yellow background) warn of hazards ahead — sharp bends, school zones, pedestrian crossings. Informatory signs (rectangular, blue or green) give guidance — directions, distances, facilities. This lesson covers the 30 most common signs you will encounter on your test and on the road.',
    },
    {
      order:       4,
      title:       'Road Safety Rules',
      duration:    '25 minutes',
      description: 'Core Indian Motor Vehicles Act rules every driver must know before taking to the road.',
      content:     'This lesson covers the legal and practical rules that govern driving in India: lane discipline on single and multi-lane roads, right-of-way at intersections and roundabouts, speed limits by road type and zone, rules for overtaking, use of headlights and indicators, seat belt and helmet obligations, blood alcohol limits, and penalties for violations under the Motor Vehicles (Amendment) Act 2019.',
    },
    {
      order:       5,
      title:       "Driving Do's and Don'ts",
      duration:    '20 minutes',
      description: "A practical summary of the habits that distinguish safe drivers from dangerous ones.",
      content:     "Do: always check mirrors before changing lanes, signal every intention, keep a safe following distance (the 2-second rule), yield to pedestrians at crossings, and stay within the speed limit. Don't: use a mobile phone while driving, tailgate, run amber or red lights, drive fatigued, or assume other drivers will behave predictably. This lesson presents real-world scenarios for each point so the rules become intuitive rather than abstract.",
    },
  ],

  'DriveEase Road Ready': [
    {
      order:       1,
      title:       'Traffic Rules and Regulations',
      duration:    '30 minutes',
      description: 'A comprehensive look at the Motor Vehicles Act rules that apply at every stage of a journey.',
      content:     'Building on the basics, this lesson goes deeper into India-specific regulations: priority rules at T-junctions and four-way stops, rules for bus lanes and emergency vehicle corridors, restrictions in school and hospital zones, night driving requirements, and documentation every driver must carry. We also cover the digital Digilocker approach for licence and insurance documents.',
    },
    {
      order:       2,
      title:       'Understanding Road Signs',
      duration:    '25 minutes',
      description: 'Extended study of temporary signs, roadwork signs, and variable message signs.',
      content:     'Beyond the 30 core signs from Course 1, this lesson covers temporary construction signs, police-directed traffic signals, variable message signs on highways, and line markings — solid white, broken white, solid yellow, double yellow. Understanding how road markings interact with signs is essential for safe lane changes and overtaking decisions.',
    },
    {
      order:       3,
      title:       'Defensive Driving',
      duration:    '35 minutes',
      description: 'Techniques to anticipate and respond to the mistakes of other road users.',
      content:     'Defensive driving is about expecting the unexpected. Core techniques: the SIPDE process (Scan, Identify, Predict, Decide, Execute), maintaining space cushions on all four sides, eye lead time — looking 12-15 seconds ahead in urban areas, recognising driver distraction signs, and how to respond when another vehicle encroaches on your lane. This lesson includes analysis of five common accident scenarios and how defensive technique would have prevented each.',
    },
    {
      order:       4,
      title:       'Lane Discipline and Turning',
      duration:    '30 minutes',
      description: 'Correct lane selection, lane changing procedure, and turning technique at various junction types.',
      content:     'Good lane discipline reduces conflicts and accidents. Topics: choosing the correct lane before a turn, the mirror-signal-manoeuvre sequence, blind spot checks, merging on expressways, U-turns where permitted, three-point turns in narrow roads, and navigating roundabouts. Special attention is given to turning at intersections with and without traffic signals.',
    },
    {
      order:       5,
      title:       'Parking Fundamentals',
      duration:    '25 minutes',
      description: 'Parallel, angle, and perpendicular parking techniques plus rules on where not to park.',
      content:     "Parking is the most common source of minor accidents. This lesson covers: parallel parking step-by-step (reference points, steering inputs, finishing position), angle parking in car parks, reversing into a perpendicular space, use of parking sensors and cameras. We also cover legal restrictions — no-parking zones, yellow kerbs, fire hydrant clearances, and what 'clearway' signs mean.",
    },
    {
      order:       6,
      title:       'Common Road Situations',
      duration:    '30 minutes',
      description: 'Practical handling of junctions, roundabouts, level crossings, and pedestrian zones.',
      content:     'Theory becomes real in this situational lesson. We walk through: approaching and clearing a busy roundabout, crossing a railway level crossing safely, sharing the road with cyclists and motorcyclists, driving near school buses (stop laws), managing a lane merge when one lane ends, and the correct procedure when you miss your turn. Each situation is presented with a decision tree.',
    },
    {
      order:       7,
      title:       'Road Safety Assessment',
      duration:    '20 minutes',
      description: 'Review of Course 2 content with self-assessment questions to confirm readiness.',
      content:     "This final lesson consolidates everything covered in Road Ready. It presents 20 scenario-based questions mirroring the format of the actual driving licence theory test. After completing the self-assessment, you will know which topics to revisit before attempting the module quiz. A readiness checklist is provided: if you can answer 17 of 20 correctly, you are ready for the Road Ready quiz.",
    },
  ],

  'DriveEase Pro Driving Mastery': [
    {
      order:       1,
      title:       'Advanced Vehicle Control',
      duration:    '35 minutes',
      description: 'Precision control at speed: weight transfer, oversteer/understeer correction, and smooth inputs.',
      content:     'At higher speeds, small steering and pedal inputs have large effects. This lesson explains vehicle dynamics: how weight shifts during braking, acceleration, and cornering; what causes understeer and oversteer; how to correct a skid on dry and wet surfaces; threshold braking vs ABS technique; and trail braking in wet conditions. Understanding these principles makes you a safer driver in any situation.',
    },
    {
      order:       2,
      title:       'Defensive Driving Mastery',
      duration:    '35 minutes',
      description: 'Advanced application of defensive techniques in high-density urban and inter-city traffic.',
      content:     "Mastery-level defensive driving goes beyond basic SIPDE. Topics: commentary driving as a training tool, the 'what if' mental model for every road situation, managing driver frustration and road rage (yours and others'), fatigue management on long journeys (20-minute rest rule), micro-sleep recognition, and how to respond safely when another driver behaves aggressively. Includes analysis of 10 dashcam case studies.",
    },
    {
      order:       3,
      title:       'Highway Driving',
      duration:    '40 minutes',
      description: 'Joining, driving on, and exiting national highways and expressways safely.',
      content:     'Highway driving demands confidence and planning. This lesson covers: joining a highway from an acceleration lane (matching speed before merging), maintaining a minimum 3-second following gap at 100 km/h, overtaking safely on a two-lane highway, use of hazard lights, stopping on a hard shoulder only in emergencies, reading countdown markers before exits, toll plaza procedures, and fatigue management on journeys over 200 km.',
    },
    {
      order:       4,
      title:       'Night and Low-Visibility Driving',
      duration:    '35 minutes',
      description: 'Headlight management, fog light use, and adapting driving style in poor visibility.',
      content:     'Human vision degrades sharply at night and in fog. Key points: when to use low beam vs high beam (switch to low within 200 m of oncoming traffic), fog light activation rules (visibility below 100 m only), speed adaptation to headlight range (never overdrive your lights), use of road cats-eyes and lane markings as reference, rain film on windscreen and wiper technique, and adapting following distance in wet conditions. Covers monsoon-specific risks for Indian roads.',
    },
    {
      order:       5,
      title:       'Advanced Parking Techniques',
      duration:    '30 minutes',
      description: 'Multi-storey car parks, tight urban spaces, hill parking, and use of parking aids.',
      content:     'Advanced parking includes situations not covered in Course 2. Topics: parking on a gradient — leaving in gear or Park with wheels turned against the kerb, multi-storey car park navigation and width judgement, parking in narrow Indian lanes where conventional technique fails, reversing around a corner, using front and rear parking sensors together, and interpreting camera overlays. A common mistake section covers the errors that cause the most parking damage.',
    },
    {
      order:       6,
      title:       'Emergency Situations',
      duration:    '40 minutes',
      description: 'Correct responses to tyre blowout, brake failure, vehicle fire, and accident scenes.',
      content:     "Emergency handling separates trained drivers from untrained ones. This lesson covers: tyre blowout response (do not brake suddenly — grip firmly, ease off accelerator, steer straight, slow gradually), brake fade and brake failure procedure, what to do if the accelerator sticks, handling a vehicle fire (pull over, engine off, evacuate, do not open bonnet into flames), first response at an accident scene (STOP — Safety, Traffic management, Observe, Phone), and what information to exchange with other drivers.",
    },
    {
      order:       7,
      title:       'Traffic and Risk Management',
      duration:    '35 minutes',
      description: 'Systematic risk assessment and decision-making in complex traffic environments.',
      content:     'This lesson introduces a formal risk management framework for driving: hazard perception scoring, the hierarchy of road users and vulnerability, risk matrix for common driving decisions, cognitive load management (reducing in-car distractions before complex manoeuvres), and route planning to avoid high-risk zones and times. Includes a case study on how a series of small decisions led to a serious accident and which single intervention would have broken the chain.',
    },
    {
      order:       8,
      title:       'Final Driving Readiness',
      duration:    '30 minutes',
      description: 'Comprehensive review and readiness assessment for the full driving licence test.',
      content:     "This concluding lesson consolidates all Pro Driving Mastery content. It presents a 30-question mock test covering vehicle dynamics, highway rules, emergency procedures, risk management, and traffic law. A score of 25/30 indicates readiness for the practical driving test. The lesson also covers what examiners look for during the road test, common failure points, and a pre-test routine: vehicle check, mirror and seat adjustment, and the first 30 seconds of driving which examiners weight heavily.",
    },
  ],
};

// ── Subscription Plans ────────────────────────────────────────────────────
// NOTE on pricing architecture:
//   - Course model has NO price field. Courses are free to view and enroll.
//   - Pricing is implemented via Subscription Plans (Plan model).
//   - Plans are platform-wide, not linked to individual courses.
//   - amountPaise minimum enforced by the API is 100 (= ₹1).
//   - A ₹0 / free plan is NOT creatable via the existing API.
//   - "DriveEase Driving Basics" at ₹0 means: no plan required, enroll freely.
//   - "DriveEase Road Ready" at ₹1 and "Pro Driving Mastery" at ₹1000
//     are represented as platform subscription plans that unlock premium access.
const PLANS = [
  {
    courseTitle:  'DriveEase Driving Basics',
    name:         'DriveEase Driving Basics Plan',
    description:  'Free enrollment for DriveEase Driving Basics.',
    durationDays: 3650,
    amountPaise:  0,
    currency:     'INR',
    features:     ['DriveEase Driving Basics course access'],
  },
  {
    courseTitle:  'DriveEase Road Ready',
    name:         'DriveEase Road Ready Plan',
    description:  'Unlock the Road Ready course and all beginner premium content for 30 days.',
    durationDays: 30,
    amountPaise:  100,       // ₹1 in paise
    currency:     'INR',
    features:     [
      'Road Ready course access',
      'Traffic Rules module',
      'Defensive Driving module',
      'Module quizzes',
    ],
  },
  {
    courseTitle:  'DriveEase Pro Driving Mastery',
    name:         'DriveEase Pro Mastery Plan',
    description:  'Full platform access including the Pro Driving Mastery course and all mock tests for 90 days.',
    durationDays: 90,
    amountPaise:  100000,    // ₹1000 in paise
    currency:     'INR',
    features:     [
      'Pro Driving Mastery course access',
      'Highway Driving module',
      'Emergency Situations module',
      'All mock tests',
      'Advanced quizzes',
    ],
  },
];

// ── Quizzes ───────────────────────────────────────────────────────────────
// Standalone — not linked to any course (Quiz model has no courseId).
// quizType: 'quiz' | 'mock_test'
// category: 'traffic_signs' | 'road_rules' | 'vehicle_control' | 'general' | 'mixed'
const QUIZZES = [
  {
    title:             'Traffic Signs Basics',
    description:       'Test your knowledge of mandatory, cautionary, and informatory road signs used on Indian roads.',
    quizType:          'quiz',
    category:          'traffic_signs',
    timeLimitMinutes:  10,
    passingScore:      70,
    questions: [
      {
        text:          'A round sign with a red border and white background is a:',
        options:       [{ text: 'Cautionary sign' }, { text: 'Mandatory sign' }, { text: 'Informatory sign' }, { text: 'Temporary sign' }],
        correctAnswer: 1,
        explanation:   'Round signs with a red border are mandatory signs — they indicate rules you must follow.',
      },
      {
        text:          'A triangular yellow sign indicates:',
        options:       [{ text: 'Road information' }, { text: 'A mandatory instruction' }, { text: 'A hazard or warning ahead' }, { text: 'A parking zone' }],
        correctAnswer: 2,
        explanation:   'Triangular signs with a yellow/white background are cautionary — they warn of hazards.',
      },
      {
        text:          'What does a red circle with a horizontal white bar mean?',
        options:       [{ text: 'No parking' }, { text: 'No entry' }, { text: 'Stop ahead' }, { text: 'Speed limit ends' }],
        correctAnswer: 1,
        explanation:   'A red circle with a white horizontal bar is the universal No Entry sign.',
      },
      {
        text:          'A blue rectangular sign generally provides:',
        options:       [{ text: 'A warning' }, { text: 'A mandatory instruction' }, { text: 'Useful information or direction' }, { text: 'A school zone alert' }],
        correctAnswer: 2,
        explanation:   'Blue or green rectangular signs are informatory — they provide direction and facility information.',
      },
      {
        text:          'The "Give Way" sign requires you to:',
        options:       [{ text: 'Stop completely at the line' }, { text: 'Slow and yield to crossing traffic' }, { text: 'Maintain your current speed' }, { text: 'Sound the horn before proceeding' }],
        correctAnswer: 1,
        explanation:   'Give Way means slow down and yield to any traffic on the road you are joining — you do not need to stop if the way is clear.',
      },
    ],
  },

  {
    title:             'Road Rules and Safety',
    description:       'Assess your understanding of Indian traffic laws, right-of-way, speed limits, and safe driving practices.',
    quizType:          'quiz',
    category:          'road_rules',
    timeLimitMinutes:  12,
    passingScore:      70,
    questions: [
      {
        text:          'What is the general speed limit for a car on a national highway in India?',
        options:       [{ text: '60 km/h' }, { text: '80 km/h' }, { text: '100 km/h' }, { text: '120 km/h' }],
        correctAnswer: 2,
        explanation:   'The general speed limit for light motor vehicles on national highways is 100 km/h under the Motor Vehicles Act.',
      },
      {
        text:          'At an uncontrolled intersection, right-of-way belongs to:',
        options:       [{ text: 'The vehicle that arrived first' }, { text: 'The vehicle on the right' }, { text: 'The larger vehicle' }, { text: 'The vehicle going straight' }],
        correctAnswer: 0,
        explanation:   'At an uncontrolled intersection the vehicle that arrives first has the right of way. If simultaneous, yield to the right.',
      },
      {
        text:          'What is the legal blood alcohol concentration (BAC) limit for drivers in India?',
        options:       [{ text: '0.03% (30 mg per 100 ml)' }, { text: '0.05% (50 mg per 100 ml)' }, { text: '0.08% (80 mg per 100 ml)' }, { text: 'Zero tolerance' }],
        correctAnswer: 0,
        explanation:   'India\'s legal BAC limit is 30 mg of alcohol per 100 ml of blood (0.03%).',
      },
      {
        text:          'You must use your headlights:',
        options:       [{ text: 'Only in complete darkness' }, { text: 'From sunset to sunrise and in poor visibility' }, { text: 'Only when driving over 60 km/h at night' }, { text: 'Only on highways' }],
        correctAnswer: 1,
        explanation:   'Headlights are required from sunset to sunrise and whenever visibility is reduced — fog, heavy rain, or dust.',
      },
      {
        text:          'Using a mobile phone while driving (without a hands-free kit) is:',
        options:       [{ text: 'Permitted at speeds under 40 km/h' }, { text: 'Permitted while stationary at a red light' }, { text: 'Illegal at all times while the vehicle is in motion' }, { text: 'Only illegal on highways' }],
        correctAnswer: 2,
        explanation:   'Under the Motor Vehicles Act, using a handheld mobile phone while driving is illegal regardless of speed.',
      },
    ],
  },

  {
    title:             'Vehicle Control Basics',
    description:       'Test your knowledge of car controls, instrument panels, and pre-drive procedures.',
    quizType:          'quiz',
    category:          'vehicle_control',
    timeLimitMinutes:  10,
    passingScore:      65,
    questions: [
      {
        text:          'Before starting the engine, you should first:',
        options:       [{ text: 'Adjust the air conditioning' }, { text: 'Check mirrors and adjust seat position' }, { text: 'Release the handbrake' }, { text: 'Check fuel and immediately start driving' }],
        correctAnswer: 1,
        explanation:   'Correct pre-drive procedure: adjust seat, adjust mirrors, fasten seat belt — then start the engine.',
      },
      {
        text:          'A red temperature warning light on the dashboard means:',
        options:       [{ text: 'The engine is warming up normally' }, { text: 'The engine oil is low' }, { text: 'The engine is overheating — stop safely as soon as possible' }, { text: 'The coolant is at optimal temperature' }],
        correctAnswer: 2,
        explanation:   'A red temperature warning indicates the engine is overheating. Stop safely, switch off the engine, and do not open the bonnet immediately.',
      },
      {
        text:          'In an automatic vehicle, which gear should you select when parking on a level surface?',
        options:       [{ text: 'N (Neutral)' }, { text: 'D (Drive)' }, { text: 'P (Park)' }, { text: 'R (Reverse)' }],
        correctAnswer: 2,
        explanation:   'Always select P (Park) when parking an automatic vehicle. It mechanically locks the transmission.',
      },
      {
        text:          'The "two-second rule" refers to:',
        options:       [{ text: 'Time to check mirrors before changing lane' }, { text: 'Minimum following distance behind the vehicle ahead' }, { text: 'Time allowed to react at a green light' }, { text: 'Duration of a valid indicator signal' }],
        correctAnswer: 1,
        explanation:   'The two-second rule: when the vehicle ahead passes a fixed point, at least 2 seconds should pass before you reach the same point.',
      },
      {
        text:          'When should you check your blind spot?',
        options:       [{ text: 'Only when reversing' }, { text: 'Before every lane change or merge' }, { text: 'Only at intersections' }, { text: 'Only when the wing mirror shows nothing' }],
        correctAnswer: 1,
        explanation:   'Blind spots are areas mirrors cannot cover. Always do a shoulder check (head turn) before every lane change or merge manoeuvre.',
      },
    ],
  },

  {
    title:             'Final Driving Mock Test',
    description:       'A comprehensive 10-question mock test covering all driving theory topics. Aim for 80% to confirm readiness for your licence test.',
    quizType:          'mock_test',
    category:          'mixed',
    timeLimitMinutes:  20,
    passingScore:      80,
    questions: [
      {
        text:          'Which sign would you find at a school crossing?',
        options:       [{ text: 'A red circle with a speed number' }, { text: 'A triangular cautionary sign with children figures' }, { text: 'A blue rectangular information sign' }, { text: 'A green diamond' }],
        correctAnswer: 1,
        explanation:   'School crossings are marked with triangular cautionary signs showing children, alerting drivers to slow down.',
      },
      {
        text:          'You are driving at 80 km/h. What is the minimum recommended following distance?',
        options:       [{ text: '10 metres' }, { text: '25 metres' }, { text: '44 metres' }, { text: '100 metres' }],
        correctAnswer: 2,
        explanation:   'At 80 km/h the two-second rule gives approximately 44 metres (22 m/s × 2 s). In wet conditions, double this.',
      },
      {
        text:          'A solid white line in the centre of a two-lane road means:',
        options:       [{ text: 'Overtaking is permitted for both directions' }, { text: 'Overtaking is not permitted' }, { text: 'Slower vehicles must use the left lane' }, { text: 'The road narrows ahead' }],
        correctAnswer: 1,
        explanation:   'A solid white centre line prohibits overtaking. You must not cross it except to avoid an obstruction.',
      },
      {
        text:          'If your tyre blows out at speed, you should first:',
        options:       [{ text: 'Apply the brakes hard immediately' }, { text: 'Grip the wheel firmly and ease off the accelerator' }, { text: 'Steer sharply to the shoulder' }, { text: 'Switch off the engine immediately' }],
        correctAnswer: 1,
        explanation:   'Hard braking on a blowout causes loss of control. Grip firmly, ease off the accelerator, let the car slow, then steer gently to safety.',
      },
      {
        text:          'On a roundabout, vehicles already in the roundabout have priority over:',
        options:       [{ text: 'Vehicles on the right' }, { text: 'Vehicles entering from any approach' }, { text: 'Vehicles on the left' }, { text: 'No one — first come first served' }],
        correctAnswer: 1,
        explanation:   'Give way to all vehicles already circulating in the roundabout before entering.',
      },
      {
        text:          'You arrive at a railway level crossing and the barriers are up. You should:',
        options:       [{ text: 'Proceed immediately while the way is clear' }, { text: 'Stop, look both ways, listen, and cross only when safe' }, { text: 'Sound the horn and proceed quickly' }, { text: 'Wait for another vehicle to cross first' }],
        correctAnswer: 1,
        explanation:   'Even with barriers up, always stop, look, and listen at a level crossing before proceeding.',
      },
      {
        text:          'High beam headlights should be switched to low beam when:',
        options:       [{ text: 'Entering a tunnel' }, { text: 'An oncoming vehicle is within 200 metres' }, { text: 'Driving above 80 km/h' }, { text: 'Driving in fog' }],
        correctAnswer: 1,
        explanation:   'Dip to low beam when an oncoming vehicle is within 200 metres to avoid blinding the other driver.',
      },
      {
        text:          'What is the correct response when an emergency vehicle with sirens on approaches from behind?',
        options:       [{ text: 'Accelerate to get out of the way quickly' }, { text: 'Stop immediately in your lane' }, { text: 'Move to the left, slow down, and allow the vehicle to pass' }, { text: 'Continue driving; they will go around you' }],
        correctAnswer: 2,
        explanation:   'Move left and slow down to create a clear path for the emergency vehicle.',
      },
      {
        text:          'Driving while fatigued is dangerous primarily because:',
        options:       [{ text: 'It increases fuel consumption' }, { text: 'It slows reaction time and can cause micro-sleep episodes' }, { text: 'It reduces engine performance' }, { text: 'It causes excessive mirror checking' }],
        correctAnswer: 1,
        explanation:   'Fatigue impairs reaction time comparably to alcohol and can cause micro-sleeps lasting several seconds — long enough to miss a hazard entirely.',
      },
      {
        text:          'At an uncontrolled T-junction, traffic on the main road:',
        options:       [{ text: 'Must always stop for joining traffic' }, { text: 'Shares equal priority with joining traffic' }, { text: 'Has priority over traffic joining from the minor road' }, { text: 'Has priority only if travelling faster' }],
        correctAnswer: 2,
        explanation:   'Vehicles on the main (through) road have priority. Traffic joining from a minor road must give way.',
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log(`\n${BOLD}${CYAN}DriveEase Local Seed Script${RESET}`);
  console.log('Uses existing HTTP APIs only. Does not touch MongoDB directly.\n');

  // ── Step 1: Prompt for credentials ──────────────────────────────────────
  const email    = await prompt('Admin email: ');
  const password = await prompt('Admin password: ', true);

  // ── Step 2: Login ────────────────────────────────────────────────────────
  section('Authentication');
  const loginRes = await req('POST', '/auth/login', { email, password });

  if (loginRes.status !== 200) {
    console.error(`${RED}${BOLD}Login failed (${loginRes.status}): ${loginRes.body.message}${RESET}`);
    process.exit(1);
  }

  // Extract the httpOnly accessToken cookie value for reuse
  const accessToken = extractCookie(loginRes.cookies, 'accessToken');
  if (!accessToken) {
    console.error(`${RED}${BOLD}Login succeeded but no accessToken cookie was returned.${RESET}`);
    process.exit(1);
  }

  const cookie = `accessToken=${accessToken}`;
  const adminName = loginRes.body.data?.user?.name || email;
  console.log(`  ${GREEN}${BOLD}Logged in as: ${adminName}${RESET}`);

  // ── Step 3: Courses ──────────────────────────────────────────────────────
  section('Courses');

  // Fetch all existing published courses to check for duplicates by title
  const existingCoursesRes = await req('GET', '/courses?limit=100', null, cookie);
  const existingCourseTitles = new Set(
    (existingCoursesRes.body.data?.courses || []).map((c) => c.title.trim().toLowerCase())
  );

  const courseIdMap = {}; // title → _id, built from existing + newly created

  // Pre-populate from existing courses
  for (const c of existingCoursesRes.body.data?.courses || []) {
    courseIdMap[c.title.trim()] = c._id;
  }

  for (const course of COURSES) {
    const titleKey = course.title.trim().toLowerCase();
    if (existingCourseTitles.has(titleKey)) {
      log('SKIPPED', `Course: "${course.title}"`, 'already exists');
      continue;
    }

    const res = await req('POST', '/courses', course, cookie);
    if (res.status === 201) {
      const id = res.body.data?.course?._id;
      courseIdMap[course.title.trim()] = id;
      log('CREATED', `Course: "${course.title}"`, `ID: ${id}`);
    } else {
      log('FAILED', `Course: "${course.title}"`, `${res.status} — ${res.body.message}`);
    }
  }

  // ── Step 4: Lessons ──────────────────────────────────────────────────────
  section('Lessons');

  for (const [courseTitle, lessons] of Object.entries(LESSONS)) {
    const courseId = courseIdMap[courseTitle];
    if (!courseId) {
      console.log(`  ${YELLOW}${BOLD}[SKIPPED]${RESET} All lessons for "${courseTitle}" — course ID not found, skipping`);
      continue;
    }

    // Fetch existing lessons for this course via admin endpoint to check (courseId+order) uniqueness
    // The admin /admin/lessons endpoint accepts courseId as a filter
    const existingLessonsRes = await req('GET', `/admin/lessons?courseId=${courseId}&limit=100`, null, cookie);
    const existingOrders = new Set(
      (existingLessonsRes.body.data?.lessons || []).map((l) => l.order)
    );

    for (const lesson of lessons) {
      if (existingOrders.has(lesson.order)) {
        log('SKIPPED', `Lesson order ${lesson.order}: "${lesson.title}"`, `(${courseTitle}) order already exists`);
        continue;
      }

      const body = {
        courseId,
        title:       lesson.title,
        duration:    lesson.duration,
        order:       lesson.order,
        description: lesson.description,
        content:     lesson.content,
        // videoUrl intentionally omitted — no real test video URL available
      };

      const res = await req('POST', '/lessons', body, cookie);
      if (res.status === 201) {
        log('CREATED', `Lesson order ${lesson.order}: "${lesson.title}"`, courseTitle);
      } else {
        log('FAILED', `Lesson order ${lesson.order}: "${lesson.title}"`, `${res.status} — ${res.body.message}`);
      }
    }
  }

  // ── Step 5: Subscription Plans ───────────────────────────────────────────
  section('Subscription Plans');
  console.log(`  ${YELLOW}Each course is linked to one course-specific plan.${RESET}\n`);

  // Fetch existing plans (admin endpoint — includes inactive plans)
  const existingPlansRes = await req('GET', '/subscriptions/admin/plans', null, cookie);
  const existingPlanNames = new Set(
    (existingPlansRes.body.data?.plans || []).map((p) => p.name.trim().toLowerCase())
  );

  for (const plan of PLANS) {
    const nameKey = plan.name.trim().toLowerCase();
    if (existingPlanNames.has(nameKey)) {
      log('SKIPPED', `Plan: "${plan.name}"`, 'already exists');
      continue;
    }

    const { courseTitle, ...planData } = plan;
    const res = await req('POST', '/subscriptions/plans', { ...planData, courseId: courseIdMap[courseTitle] }, cookie);
    if (res.status === 201) {
      const id = res.body.data?.plan?._id;
      log('CREATED', `Plan: "${plan.name}"`, `₹${plan.amountPaise / 100} / ${plan.durationDays} days — ID: ${id}`);
    } else {
      log('FAILED', `Plan: "${plan.name}"`, `${res.status} — ${res.body.message}`);
    }
  }

  // Reuse Basics lessons for the paid courses instead of creating duplicate lessons.
  for (const title of ['DriveEase Road Ready', 'DriveEase Pro Driving Mastery']) {
    const res = await req('PATCH', `/courses/${courseIdMap[title]}`, { contentSourceCourseId: courseIdMap['DriveEase Driving Basics'] }, cookie);
    if (res.status === 200) log('UPDATED', `Shared lesson source for "${title}"`, 'DriveEase Driving Basics');
    else log('FAILED', `Shared lesson source for "${title}"`, `${res.status} — ${res.body.message}`);
  }

  // ── Step 6: Quizzes ──────────────────────────────────────────────────────
  section('Quizzes');

  // Fetch existing quizzes via admin endpoint
  const existingQuizzesRes = await req('GET', '/quizzes/admin?limit=100', null, cookie);
  const existingQuizTitles = new Set(
    (existingQuizzesRes.body.data?.quizzes || []).map((q) => q.title.trim().toLowerCase())
  );

  for (const quiz of QUIZZES) {
    const titleKey = quiz.title.trim().toLowerCase();
    if (existingQuizTitles.has(titleKey)) {
      log('SKIPPED', `Quiz: "${quiz.title}"`, 'already exists');
      continue;
    }

    const res = await req('POST', '/quizzes', quiz, cookie);
    if (res.status === 201) {
      const id = res.body.data?.quiz?._id;
      log('CREATED', `Quiz: "${quiz.title}"`, `ID: ${id}`);
    } else {
      log('FAILED', `Quiz: "${quiz.title}"`, `${res.status} — ${JSON.stringify(res.body)}`);
    }
  }

  // ── Step 7: Summary ──────────────────────────────────────────────────────
  section('Done');
  console.log('  Seed script completed. Verify results in the DriveEase UI:');
  console.log('  • Public course list:  http://localhost:5173/courses');
  console.log('  • Admin dashboard:     http://localhost:5173/admin/dashboard');
  console.log('  • Subscription plans:  http://localhost:5173/student/subscription (as a student)\n');
}

main().catch((err) => {
  console.error(`\n${RED}${BOLD}Unhandled error: ${err.message}${RESET}`);
  process.exit(1);
});
