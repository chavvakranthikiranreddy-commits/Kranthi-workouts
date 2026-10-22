/* Kranthi Workouts: personalised program builder.
   Rules come from current research summaries:
   - each muscle about 2x per week; full-body and split routines work equally when weekly sets match
   - ~8-10 sets per muscle per week for beginners, 10-15 intermediate, up to ~20 advanced
   - heavy (3-6 reps) for strength, 6-12 (+ up to 20 on isolation) for muscle, sets close to failure for size
   - longer rest (2-3 min) on big lifts, 60-90 s on small ones
   - add 2-10% load once the top of the rep range is beaten
   Uses helpers from app.js (el, esc, ic, sheet, menu, toast, DB, S, plan, log ...). */
'use strict';

const Program = (() => {
  /* ---------- exercise library ----------
     [name, pattern, equipment needed (all of), type, avoid, min level, cues]
     equipment: B barbell+rack, D dumbbells, N bench, M machine, C cable, P pull-up bar, R resistance band, W bodyweight
     type: c compound, i isolation, p power, k core, t timed core, x carry
     avoid: k knees, b lower back, s shoulders, w wrists, i jumping/impact */
  const RAW = [
    // squat (knee dominant)
    ['Squat', 'squat', 'B', 'c', 'kb', 0, 'Brace your belly before every rep|Sit down between your hips, knees track over toes|Keep the bar over mid-foot all the way|Drive up through the whole foot'],
    ['Leg Press', 'squat', 'M', 'c', '', 0, 'Feet shoulder-width in the middle of the platform|Lower until hips start to curl, no lower|Push through heels and mid-foot|Do not lock the knees hard at the top'],
    ['Front Squat', 'squat', 'B', 'c', 'kw', 1, 'Elbows high, bar resting on the shoulders|Stay tall through the whole rep|Knees travel forward over toes|Drive up chest-first'],
    ['Hack Squat', 'squat', 'M', 'c', 'k', 0, 'Back flat against the pad|Lower under control to a deep bend|Push the platform away evenly|Keep heels down'],
    ['Goblet Squat', 'squat', 'D', 'c', 'k', 0, 'Hold one dumbbell at the chest|Elbows inside the knees at the bottom|Chest up, back flat|Stand tall and squeeze glutes'],
    ['Band Squat', 'squat', 'R', 'c', 'k', 0, 'Stand on the band, handles at shoulders|Sit back and down|Keep tension the whole time|Drive up hard'],
    ['Bodyweight Squat', 'squat', 'W', 'c', 'k', 0, 'Arms forward for balance|Sit down as low as comfortable|Knees follow toes|Slow down, strong up'],
    ['Box Squat', 'squat', 'W', 'c', '', 0, 'Squat back to a chair or box|Touch lightly, do not plop|Stand up through the heels|Good choice for sore knees'],
    // hinge
    ['Deadlift', 'hinge', 'B', 'c', 'b', 1, 'Bar over mid-foot, shins close|Brace and pull the slack out of the bar|Push the floor away, hips and shoulders rise together|Stand tall, no leaning back'],
    ['Romanian Deadlift', 'hinge', 'B', 'c', 'b', 0, 'Soft knees, push hips back|Bar slides down the thighs|Stop when hamstrings are tight, back flat|Squeeze glutes to stand'],
    ['Dumbbell Romanian Deadlift', 'hinge', 'D', 'c', 'b', 0, 'Dumbbells close to the legs|Hips back like closing a car door|Flat back, long neck|Stand up by squeezing glutes'],
    ['Hip Thrust', 'hinge', 'BN', 'c', '', 0, 'Upper back on the bench, bar on hips (use a pad)|Chin tucked, ribs down|Drive hips up to a straight line|Pause and squeeze at the top'],
    ['Back Extension', 'hinge', 'M', 'c', '', 0, 'Pad just below the hips|Round down slowly, then lift with glutes|Stop at a straight line|Hold a plate to make it harder'],
    ['Dumbbell Hip Thrust', 'hinge', 'DN', 'c', '', 0, 'Dumbbell on the hips|Back on bench edge|Drive up and pause|Lower slowly'],
    ['Band Good Morning', 'hinge', 'R', 'c', 'b', 0, 'Band under feet, loop behind the neck|Hips back, flat back|Stand up with glutes|Slow and controlled'],
    ['Single-Leg Romanian Deadlift', 'hinge', 'W', 'c', '', 0, 'Hold a wall or chair for balance at first|Back leg and body move as one line|Hips stay square to the floor|Stand up by squeezing the glute'],
    ['Glute Bridge', 'hinge', 'W', 'c', '', 0, 'Feet flat near your hips|Push through heels|Lift to a straight line, squeeze|Lower slowly'],
    // single leg
    ['Walking Lunge', 'lunge', 'D', 'c', 'ki', 0, 'Long step, both knees bend to 90°|Front heel stays down|Upper body tall|Push off the front foot'],
    ['Bulgarian Split Squat', 'lunge', 'DN', 'c', 'k', 0, 'Back foot on a bench|Drop straight down|Front knee over the toes|Drive up through the front heel'],
    ['Reverse Lunge', 'lunge', 'W', 'c', 'k', 0, 'Step back, not forward|Lower the back knee toward the floor|Front shin stays fairly upright|Push back up through the front heel'],
    ['Step-Up', 'lunge', 'N', 'c', '', 0, 'Whole foot on the bench or step|Drive up with the top leg only|Stand tall at the top|Lower slowly'],
    ['Split Squat', 'lunge', 'W', 'c', 'k', 0, 'Staggered stance, feet stay planted|Drop straight down|Keep the torso tall|Push up through the front foot'],
    ['Lateral Lunge', 'lunge', 'W', 'c', 'k', 0, 'Wide step to the side|Sit into that hip, other leg straight|Chest up|Push back to the middle'],
    // horizontal push
    ['Bench Press', 'hpush', 'BN', 'c', 'sw', 0, 'Eyes under the bar, shoulder blades pinched|Feet planted, slight arch|Lower to the lower chest|Press up and slightly back'],
    ['Dumbbell Bench Press', 'hpush', 'DN', 'c', '', 0, 'Dumbbells over the chest, palms forward or slightly in|Lower to chest level, elbows ~45°|Press up and together|Control the way down'],
    ['Machine Chest Press', 'hpush', 'M', 'c', '', 0, 'Handles at mid-chest height|Shoulders down and back|Press without locking hard|Slow return'],
    ['Incline Dumbbell Press', 'hpush', 'DN', 'c', '', 0, 'Bench at about 30°|Lower to the upper chest|Elbows slightly in|Press up over the shoulders'],
    ['Incline Bench Press', 'hpush', 'BN', 'c', 'sw', 1, 'Bench at about 30°|Lower to the upper chest|Shoulder blades back|Press straight up'],
    ['Dumbbell Floor Press', 'hpush', 'D', 'c', '', 0, 'Lie on the floor, knees bent|Lower until elbows touch the floor|Pause, then press|Great with no bench'],
    ['Incline Push-up', 'hpush', 'W', 'c', '', 0, 'Hands on a sturdy table, counter or bench edge|Body in one straight line|Lower chest to the edge, elbows ~45°|Use fists or push-up handles to keep wrists straight'],
    ['Push-ups', 'hpush', 'W', 'c', 'w', 0, 'Hands under shoulders, body in one line|Lower chest to the floor, elbows ~45°|Squeeze glutes and abs|Too hard? Hands on a bench or table'],
    ['Band Chest Press', 'hpush', 'R', 'c', '', 0, 'Band behind your back or anchored at chest height|Step forward for tension|Press straight out|Return slowly'],
    ['Dips', 'hpush', 'P', 'c', 's', 1, 'Shoulders down, lean slightly forward|Lower until upper arms are parallel|Press back up|Skip if it hurts the shoulders'],
    // vertical push
    ['Overhead Press', 'vpush', 'B', 'c', 'sb', 0, 'Bar at the collarbone, squeeze glutes|Press straight up, head moves back then through|Lock out over mid-foot|No leaning back'],
    ['Dumbbell Shoulder Press', 'vpush', 'D', 'c', 's', 0, 'Seated or standing, dumbbells at ear level|Press up and slightly in|Ribs down|Lower to just above shoulders'],
    ['Machine Shoulder Press', 'vpush', 'M', 'c', 's', 0, 'Seat so handles are at shoulder height|Press up without shrugging|Slow lower|Keep back on the pad'],
    ['Band Overhead Press', 'vpush', 'R', 'c', 's', 0, 'Stand on the band, handles at shoulders|Press overhead|Ribs down|Control the return'],
    ['Pike Push-up', 'vpush', 'W', 'c', 'sw', 0, 'Hips high, body in an upside-down V|Lower the head toward the floor in front of hands|Press back up|Feet on a step makes it harder'],
    ['Landmine Press', 'vpush', 'B', 'c', '', 1, 'Bar end in a corner or landmine|Press up and forward|Shoulder-friendly angle|Brace the core'],
    // horizontal pull
    ['Seated Cable Row', 'hpull', 'C', 'c', '', 0, 'Sit tall, slight knee bend|Pull handle to the belly|Squeeze shoulder blades together|Let the arms stretch forward slowly'],
    ['Barbell Row', 'hpull', 'B', 'c', 'b', 1, 'Hinge to about 45°, flat back|Pull the bar to the lower ribs|Elbows go back, not out|Lower under control'],
    ['Dumbbell Row', 'hpull', 'DN', 'c', '', 0, 'One hand and knee on the bench|Pull the dumbbell to the hip|Do not twist the torso|Full stretch at the bottom'],
    ['Chest-Supported Row', 'hpull', 'DN', 'c', '', 0, 'Lie face down on an incline bench|Pull dumbbells to the sides|Squeeze shoulder blades|Back-friendly'],
    ['Band Row', 'hpull', 'R', 'c', '', 0, 'Band anchored at chest height or around feet|Pull elbows back past the body|Squeeze, then return slowly|Sit or stand tall'],
    ['Single-Arm Dumbbell Row', 'hpull', 'D', 'c', '', 0, 'Hand on a chair or knee for support|Pull to the hip|Flat back|Slow lower'],
    ['Inverted Row', 'hpull', 'W', 'c', '', 0, 'Under a sturdy table or low bar, body straight|Pull the chest up to it|Squeeze shoulder blades|Bend knees to make it easier'],
    // vertical pull
    ['Lat Pulldown', 'vpull', 'C', 'c', '', 0, 'Thighs locked under the pad|Pull the bar to the upper chest|Lead with the elbows|Let the arms fully straighten up top'],
    ['Pull-ups', 'vpull', 'P', 'c', '', 1, 'Hands just wider than shoulders|Pull the chest toward the bar|Shoulders down, away from ears|Lower all the way'],
    ['Chin-ups', 'vpull', 'P', 'c', '', 1, 'Palms facing you, shoulder width|Pull chin over the bar|Control the way down|Use a band for help if needed'],
    ['Assisted Pull-up', 'vpull', 'M', 'c', '', 0, 'Knees on the pad, choose help weight|Pull chest to the bar|Slow lowering|Less help over time'],
    ['Band Lat Pulldown', 'vpull', 'R', 'c', '', 0, 'Band anchored high (door top)|Kneel and pull elbows down to your sides|Squeeze the lats|Return slowly'],
    ['Negative Pull-up', 'vpull', 'P', 'c', '', 0, 'Jump or step to the top position|Lower as slowly as you can (3-5 s)|Reset and repeat|Builds up to full pull-ups'],
    ['Towel Door Row', 'vpull', 'W', 'c', '', 0, 'Towel over a solid door handle, door closed|Lean back, arms straight|Pull yourself in|Feet closer to the door = harder'],
    // isolation
    ['Leg Extension', 'quad', 'M', 'i', 'k', 0, 'Knee lines up with the machine pivot|Kick up and squeeze the quads|Lower slowly|Do not swing'],
    ['Wall Sit', 'quad', 'W', 't', 'k', 0, 'Back flat on the wall|Thighs parallel to the floor|Hold and breathe|Stop if knees hurt'],
    ['Band Leg Extension', 'quad', 'R', 'i', 'k', 0, 'Seated, band from chair leg to ankle|Straighten the knee|Squeeze at the top|Return slowly'],
    ['Leg Curl', 'ham', 'M', 'i', '', 0, 'Pad just above the heels|Curl all the way|Hips stay down|Slow lower'],
    ['Sliding Leg Curl', 'ham', 'W', 'i', '', 0, 'Lie on back, heels on a towel or socks on a smooth floor|Lift hips, slide heels in|Slide back out slowly|Keep hips up'],
    ['Nordic Curl', 'ham', 'W', 'i', 'k', 1, 'Kneel with ankles held down|Lower forward as slowly as possible|Catch with hands, push back up|Very hard; partial range is fine'],
    ['Band Leg Curl', 'ham', 'R', 'i', '', 0, 'Lie face down, band from anchor to ankle|Curl heel to glute|Slow return|Keep hips down'],
    ['Cable Kickback', 'glute', 'C', 'i', '', 0, 'Ankle strap, hold the frame|Kick back and slightly up|Squeeze the glute|No lower-back arching'],
    ['Band Kickback', 'glute', 'R', 'i', '', 0, 'Band around ankles or feet|Kick back from the hip|Squeeze at the top|Slow return'],
    ['Hip Abduction', 'glute', 'M', 'i', '', 0, 'Sit tall, push knees out|Pause at the widest point|Slow return|Lean slightly forward for more glute'],
    ['Single-Leg Glute Bridge', 'glute', 'W', 'i', '', 0, 'One foot down, other knee up|Drive hips up through the heel|Hips stay level|Pause at top'],
    ['Calf Raise', 'calf', 'M', 'i', '', 0, 'Balls of the feet on the edge|Full stretch at the bottom|Rise as high as possible|Pause at the top'],
    ['Dumbbell Calf Raise', 'calf', 'D', 'i', '', 0, 'Hold dumbbells, stand on a step|Deep stretch down|High up|Slow and controlled'],
    ['Single-Leg Calf Raise', 'calf', 'W', 'i', '', 0, 'One foot on a step, hold a wall|Full range|Pause at top|Switch legs'],
    ['Cable Fly', 'chest', 'C', 'i', '', 0, 'Handles at chest height, step forward|Arms slightly bent, hug a tree|Squeeze in the middle|Wide stretch back'],
    ['Pec Deck', 'chest', 'M', 'i', '', 0, 'Handles at chest height|Bring them together in front|Squeeze|Slow return'],
    ['Dumbbell Fly', 'chest', 'DN', 'i', 's', 0, 'Slight bend in the elbows|Open wide to a chest stretch|Bring back up over the chest|Lighter than you think'],
    ['Band Fly', 'chest', 'R', 'i', '', 0, 'Band behind you at chest height|Arms out, slight bend|Bring hands together|Slow return'],
    ['Lateral Raise', 'sdelt', 'D', 'i', '', 0, 'Slight lean forward, soft elbows|Raise to shoulder height|Lead with the elbows|Lower slowly, no swinging'],
    ['Cable Lateral Raise', 'sdelt', 'C', 'i', '', 0, 'Cable low, handle in far hand|Raise out to shoulder height|Control down|Great constant tension'],
    ['Band Lateral Raise', 'sdelt', 'R', 'i', '', 0, 'Stand on band|Raise out to the sides|Shoulder height only|Slow lower'],
    ['Face Pull', 'rdelt', 'C', 'i', '', 0, 'Rope at face height|Pull to the eyes, elbows high|Rotate hands back|Great for shoulder health'],
    ['Reverse Dumbbell Fly', 'rdelt', 'D', 'i', '', 0, 'Hinge forward, flat back|Raise arms out wide|Squeeze upper back|Light weight'],
    ['Band Pull-Apart', 'rdelt', 'R', 'i', '', 0, 'Band at chest height, arms straight|Pull hands apart to touch chest|Squeeze shoulder blades|Slow return'],
    ['Prone Y Raise', 'rdelt', 'W', 'i', '', 0, 'Lie face down, arms in a Y|Lift thumbs up off the floor|Hold 1-2 s|Lower slowly'],
    ['Barbell Curl', 'bi', 'B', 'i', 'w', 0, 'Elbows pinned to your sides|Curl without swinging|Squeeze at the top|Lower slowly'],
    ['Dumbbell Curl', 'bi', 'D', 'i', '', 0, 'Palms forward|Elbows still|Full stretch at the bottom|No body swing'],
    ['Hammer Curl', 'bi', 'D', 'i', '', 0, 'Palms facing each other|Curl up to the shoulder|Elbows still|Works forearms too'],
    ['Cable Curl', 'bi', 'C', 'i', '', 0, 'Stand close to the cable|Elbows at your sides|Curl and squeeze|Slow lower'],
    ['Band Curl', 'bi', 'R', 'i', '', 0, 'Stand on the band|Curl up, elbows still|Squeeze|Control down'],
    ['Tricep Pushdown', 'tri', 'C', 'i', '', 0, 'Elbows pinned to your sides|Push down to straight arms|Squeeze|Let it come back up slowly'],
    ['Overhead Tricep Extension', 'tri', 'D', 'i', 's', 0, 'One dumbbell held with both hands overhead|Lower behind the head|Elbows point up|Extend fully'],
    ['Skull Crusher', 'tri', 'DN', 'i', 'w', 1, 'Lie on a bench, arms up|Bend elbows to bring weights beside the head|Extend back up|Elbows stay in'],
    ['Band Tricep Pushdown', 'tri', 'R', 'i', '', 0, 'Band anchored high|Elbows at sides|Push down and squeeze|Slow return'],
    ['Diamond Push-up', 'tri', 'W', 'i', 'w', 0, 'Hands close together under the chest|Elbows brush the body|Lower and press|Knees down to make easier'],
    ['Bench Dip', 'tri', 'W', 'i', 's', 0, 'Hands on a chair or bench edge behind you|Lower until elbows reach 90°|Press back up|Keep hips close to the bench'],
    // core
    ['Plank', 'core', 'W', 't', '', 0, 'Forearms under shoulders|Squeeze glutes and abs|Body in one line|Breathe, do not hold your breath'],
    ['Dead Bug', 'core', 'W', 'k', '', 0, 'Lie on back, arms and knees up|Lower opposite arm and leg slowly|Lower back stays on the floor|Alternate sides'],
    ['Pallof Press', 'core', 'C', 'k', '', 0, 'Stand side-on to the cable|Press the handle straight out|Do not let it twist you|Hold 2 s, return'],
    ['Band Pallof Press', 'core', 'R', 'k', '', 0, 'Band anchored at chest height, stand side-on|Press out and resist the twist|Hold 2 s|Both sides'],
    ['Hanging Leg Raise', 'core', 'P', 'k', '', 1, 'Hang with straight arms|Lift knees or legs without swinging|Curl the hips up|Lower slowly'],
    ['Cable Crunch', 'core', 'C', 'k', '', 0, 'Kneel, rope at your head|Crunch the ribs toward hips|Hips stay still|Slow return'],
    ['Side Plank', 'core', 'W', 't', '', 0, 'Elbow under shoulder|Hips up in a straight line|Hold, then switch sides|Knees down to make easier'],
    ['Bird Dog', 'core', 'W', 'k', '', 0, 'On hands and knees|Reach opposite arm and leg long|Hips stay level|Back-friendly core exercise'],
    // power (athletic)
    ['Box Jump', 'power_l', 'W', 'p', 'ki', 0, 'Swing arms and jump up onto a sturdy box|Land softly in a half squat|Step down, do not jump down|Full rest, max effort each rep'],
    ['Broad Jump', 'power_l', 'W', 'p', 'ki', 0, 'Swing arms and jump forward as far as possible|Land softly on both feet|Stick the landing|Walk back, reset'],
    ['Jump Squat', 'power_l', 'W', 'p', 'ki', 0, 'Quarter squat, then explode up|Land softly|Reset each rep|Quality over quantity'],
    ['Kettlebell-style Dumbbell Swing', 'power_l', 'D', 'p', 'b', 0, 'Hinge, hike the dumbbell back|Snap hips forward|Arms just guide it|Stand tall at the top'],
    ['Hang Power Clean', 'power_l', 'B', 'p', 'bw', 2, 'Bar at mid-thigh|Jump and shrug explosively|Catch on the shoulders in a quarter squat|Learn with a coach first'],
    ['Lateral Bound', 'power_l', 'W', 'p', 'ki', 0, 'Jump sideways off one leg|Land on the other, stick it 1 s|Stay low and balanced|Alternate'],
    ['Explosive Push-up', 'power_u', 'W', 'p', 'w', 1, 'Lower under control|Push up fast so hands leave the floor|Land softly|Knees down to make easier'],
    ['Speed Push-up', 'power_u', 'W', 'p', 'w', 0, 'Lower under control|Push up as fast as possible|Full rest between sets|Speed, not fatigue'],
    ['Dumbbell Push Press', 'power_u', 'D', 'p', 's', 0, 'Dumbbells at shoulders|Quick dip of the knees|Drive up explosively|Lock out overhead'],
    ['Band Explosive Row', 'power_u', 'R', 'p', '', 0, 'Band anchored in front|Pull as fast as possible|Control the return|Full rest'],
    // carries
    ['Farmer Carry', 'carry', 'D', 'x', '', 0, 'Heavy dumbbells at your sides|Walk tall, short quick steps|Shoulders back|20-40 m or 30-40 s'],
    ['Suitcase Carry', 'carry', 'D', 'x', '', 0, 'One heavy dumbbell on one side|Do not lean|Walk tall|Switch hands'],
    ['Bear Crawl', 'carry', 'W', 'x', 'w', 0, 'Hands and feet, knees hover low|Move opposite hand and foot|Back flat|Slow and controlled'],
  ];
  const EX = RAW.map(([name, pattern, eq, type, avoid, lvl, cues]) => ({ name, pattern, eq, type, avoid, lvl, cues: cues.split('|') }));
  const byName = n => EX.find(e => e.name === n);

  const PATTERN_LABEL = { squat: 'Squat', hinge: 'Hip hinge', lunge: 'Single leg', hpush: 'Push', vpush: 'Overhead push', hpull: 'Row', vpull: 'Pull down', quad: 'Quads', ham: 'Hamstrings', glute: 'Glutes', calf: 'Calves', chest: 'Chest', sdelt: 'Side delts', rdelt: 'Rear delts', bi: 'Biceps', tri: 'Triceps', core: 'Core', power_l: 'Lower-body power', power_u: 'Upper-body power', carry: 'Carry' };
  const MUSCLES = { squat: 'Quads, glutes', hinge: 'Hamstrings, glutes, lower back', lunge: 'Quads, glutes, balance', hpush: 'Chest, front shoulders, triceps', vpush: 'Shoulders, triceps', hpull: 'Upper back, lats, biceps', vpull: 'Lats, biceps', quad: 'Quads', ham: 'Hamstrings', glute: 'Glutes', calf: 'Calves', chest: 'Chest', sdelt: 'Side shoulders', rdelt: 'Rear shoulders, upper back', bi: 'Biceps', tri: 'Triceps', core: 'Abs, obliques', power_l: 'Legs (power & speed)', power_u: 'Chest, shoulders (power)', carry: 'Grip, core, whole body' };
  const PRIORITY_PATTERN = { Chest: 'chest', Back: 'hpull', Shoulders: 'sdelt', Arms: 'bi', Glutes: 'glute', Legs: 'quad', Core: 'core' };

  /* ---------- sessions (slots: pattern, role, variant) ---------- */
  const SESS = {
    FA: ['Full Body A', [['squat', 'main'], ['hpush', 'main'], ['hpull', 'sec'], ['hinge', 'sec', 1], ['sdelt', 'acc'], ['core', 'core'], ['calf', 'acc']]],
    FB: ['Full Body B', [['hinge', 'main'], ['vpush', 'main'], ['vpull', 'sec'], ['lunge', 'sec'], ['bi', 'acc'], ['tri', 'acc'], ['core', 'core', 1]]],
    FC: ['Full Body C', [['squat', 'sec', 1], ['hpush', 'sec', 1], ['vpull', 'main', 1], ['glute', 'acc'], ['rdelt', 'acc'], ['ham', 'acc'], ['core', 'core', 2]]],
    UA: ['Upper A', [['hpush', 'main'], ['hpull', 'main'], ['vpush', 'sec'], ['vpull', 'sec'], ['bi', 'acc'], ['tri', 'acc'], ['sdelt', 'acc']]],
    UB: ['Upper B', [['vpull', 'main', 1], ['hpush', 'sec', 1], ['hpull', 'sec', 1], ['vpush', 'sec', 1], ['sdelt', 'acc'], ['rdelt', 'acc'], ['bi', 'acc', 1], ['tri', 'acc', 1]]],
    LA: ['Lower A', [['squat', 'main'], ['hinge', 'sec', 1], ['lunge', 'sec'], ['ham', 'acc'], ['calf', 'acc'], ['core', 'core']]],
    LB: ['Lower B', [['hinge', 'main'], ['squat', 'sec', 1], ['lunge', 'sec', 1], ['quad', 'acc'], ['glute', 'acc'], ['calf', 'acc', 1], ['core', 'core', 1]]],
    PU: ['Push', [['hpush', 'main'], ['vpush', 'sec'], ['hpush', 'sec', 1], ['chest', 'acc'], ['sdelt', 'acc'], ['tri', 'acc'], ['tri', 'acc', 1]]],
    PL: ['Pull', [['vpull', 'main'], ['hpull', 'sec'], ['hpull', 'sec', 1], ['rdelt', 'acc'], ['bi', 'acc'], ['bi', 'acc', 1], ['core', 'core']]],
    LG: ['Legs', [['squat', 'main'], ['hinge', 'sec', 1], ['lunge', 'sec'], ['quad', 'acc'], ['ham', 'acc'], ['calf', 'acc'], ['core', 'core', 1]]],
    AU: ['Athletic Upper', [['power_u', 'power'], ['hpush', 'main'], ['hpull', 'main'], ['vpush', 'sec'], ['vpull', 'sec'], ['carry', 'acc'], ['core', 'core', 2]]],
    AL: ['Athletic Lower', [['power_l', 'power'], ['squat', 'main'], ['hinge', 'main', 1], ['lunge', 'sec', 1], ['ham', 'acc', 1], ['calf', 'acc'], ['core', 'core']]],
    AF: ['Athletic Full Body', [['power_l', 'power', 1], ['power_u', 'power'], ['squat', 'main', 1], ['hpush', 'sec'], ['vpull', 'sec'], ['hinge', 'sec', 1], ['carry', 'acc'], ['core', 'core', 2]]],
  };
  const SPLITS = {
    fb2: { name: 'Full Body ×2', days: 2, seq: ['FA', 'FB'], why: 'Two full-body days hit every muscle twice a week, the frequency research supports, in the least time.' },
    fb3: { name: 'Full Body ×3', days: 3, seq: ['FA', 'FB', 'FC'], why: 'Three full-body days are the classic beginner setup: lots of practice on the main lifts and each muscle trained 2–3× a week.' },
    ulf: { name: 'Upper / Lower / Full', days: 3, seq: ['UA', 'LA', 'FB'], why: 'An upper day, a lower day and a full-body day give each muscle 2× a week with more sets per session than pure full body.' },
    ppl3: { name: 'Push / Pull / Legs', days: 3, seq: ['PU', 'PL', 'LG'], why: 'Popular and simple, but each muscle is trained only once a week. Research slightly favours 2×, so pick this only if you enjoy it.' },
    ul4: { name: 'Upper / Lower', days: 4, seq: ['UA', 'LA', 'UB', 'LB'], why: 'Upper/Lower ×2 trains every muscle twice a week with enough recovery. It works well from beginner to advanced.' },
    fb4: { name: 'Full Body ×4', days: 4, seq: ['FA', 'FB', 'FC', 'FA*'], why: 'Short full-body sessions spread over four days. Good if you like shorter workouts.' },
    ulppl: { name: 'Upper / Lower + Push / Pull / Legs', days: 5, seq: ['UA', 'LA', 'PU', 'PL', 'LG'], why: 'A 5-day hybrid: upper and lower for strength early in the week, then push/pull/legs for extra volume. Every muscle gets 2 sessions.' },
    ppl6: { name: 'Push / Pull / Legs ×2', days: 6, seq: ['PU', 'PL', 'LG', 'PU*', 'PL*', 'LG*'], why: 'Each muscle twice a week with high volume. Best for intermediate and advanced lifters who recover well.' },
    ath2: { name: 'Athletic Full Body ×2', days: 2, seq: ['AF', 'AF*'], why: 'Jumps and throws first while you are fresh, then strength work, twice a week.' },
    ath3: { name: 'Athletic Upper / Lower / Full', days: 3, seq: ['AU', 'AL', 'AF'], why: 'Power first, then heavy strength. Plyometrics 2–3× a week improve jump, sprint and agility.' },
    yoga: { name: 'Yoga & Mobility Plan', days: 0, seq: [], why: 'Follow-along routines rotate through hips, back, shoulders and full-body flows. Short, regular practice loosens you up more than one long session a week.' },
    ath4: { name: 'Athletic Upper / Lower', days: 4, seq: ['AU', 'AL', 'AU*', 'AL*'], why: 'Power plus strength four days a week. Conditioning stays on separate days to protect explosiveness.' },
  };
  const GOALS = {
    muscle: { name: 'Build muscle', icon: 'dumbbell', d: 'Bigger, fuller muscles' },
    strength: { name: 'Get stronger', icon: 'trophy', d: 'Lift heavier on the big lifts' },
    fatloss: { name: 'Lose fat & tone', icon: 'flame', d: 'Keep muscle, burn fat, more steps' },
    athletic: { name: 'Athletic performance', icon: 'bolt', d: 'Power, speed, jumps & conditioning' },
    general: { name: 'General fitness', icon: 'heart', d: 'Feel better, move well, build a habit' },
    mobility: { name: 'Mobility & yoga', icon: 'lotus', d: 'Flexibility, posture, less stiffness' },
  };
  const LEVELS = [
    { name: 'Beginner', d: 'New to lifting, or less than 6 months of regular training' },
    { name: 'Intermediate', d: '6 months to 2 years of consistent training' },
    { name: 'Advanced', d: '2+ years and you know your lifts well' },
  ];
  // [sets, lowReps, highReps, RIR low, RIR high, rest seconds] per goal and role
  const CFG = {
    muscle: { power: [3, 3, 5, null, null, 120], main: [3, 6, 10, 1, 2, 150], sec: [3, 8, 12, 1, 2, 120], acc: [3, 10, 15, 0, 1, 75], core: [3, 10, 15, 1, 2, 60] },
    strength: { power: [3, 3, 5, null, null, 150], main: [4, 4, 6, 2, 3, 210], sec: [3, 6, 8, 2, 2, 150], acc: [2, 8, 12, 1, 2, 90], core: [3, 8, 12, 2, 2, 60] },
    fatloss: { power: [3, 5, 8, null, null, 60], main: [3, 8, 12, 1, 2, 90], sec: [3, 10, 12, 1, 2, 75], acc: [2, 12, 15, 0, 1, 60], core: [2, 12, 20, 1, 2, 45] },
    mobility: { power: [2, 5, 8, null, null, 90], main: [2, 10, 12, 3, 3, 90], sec: [2, 10, 12, 3, 3, 75], acc: [2, 12, 15, 2, 2, 60], core: [2, 10, 15, 2, 2, 45] },
    athletic: { power: [4, 3, 5, null, null, 120], main: [4, 4, 6, 2, 3, 180], sec: [3, 6, 8, 2, 2, 120], acc: [2, 8, 12, 1, 2, 75], core: [3, 8, 12, 2, 2, 60] },
    general: { power: [2, 5, 8, null, null, 90], main: [3, 8, 12, 2, 3, 90], sec: [2, 10, 12, 2, 3, 75], acc: [2, 12, 15, 1, 2, 60], core: [2, 10, 15, 2, 2, 45] },
  };
  const LEN_MAX = { 30: 4, 45: 5, 60: 6, 75: 8 };

  let prog = DB.get('program', null);
  const save = () => DB.set('program', prog);

  /* ---------- equipment & exercise choice ---------- */
  function equipSet(a) {
    if (a.where === 'gym') return new Set('BDNMCPRW'.split(''));
    const s = new Set(['W']);
    (a.equip || []).forEach(x => s.add(x));
    return s;
  }
  function candidates(pattern, role, a) {
    const eq = equipSet(a);
    const lvl = a.level;
    const avoid = new Set(a.avoid || []);
    if (a.age === '65+' || a.age === '50-64') avoid.add('i');
    if (avoid.has('k')) avoid.add('i');
    const typeOk = e => {
      if (role === 'power') return e.type === 'p';
      if (role === 'core') return e.type === 'k' || e.type === 't';
      if (role === 'main' || role === 'sec') return e.type === 'c';
      return e.type !== 'p';
    };
    const pool = EX.filter(e => e.pattern === pattern && typeOk(e) && [...e.eq].every(c => eq.has(c)));
    const safe = pool.filter(e => ![...e.avoid].some(c => avoid.has(c)));
    const lvlOk = safe.filter(e => e.lvl <= lvl);
    return lvlOk.length ? lvlOk : safe.length ? safe : [];
  }

  function buildSession(key, a, used) {
    const shift = key.endsWith('*') ? 1 : 0;
    const base = key.replace('*', '');
    const [name, slots] = SESS[base];
    const c = CFG[a.goal];
    const items = [];
    const inSession = new Set();
    let list = slots.slice();
    // Older lifters: no jumping drills.
    if (a.age === '65+') list = list.filter(s => s[1] !== 'power');
    // Priority muscles get an extra accessory slot.
    (a.priority || []).forEach(p => { const pat = PRIORITY_PATTERN[p]; if (pat && !list.some(s => s[0] === pat && s[1] === 'acc')) list.push([pat, 'acc', 0, true]); });
    for (const [pattern, role, variant = 0, prio] of list) {
      const cands = candidates(pattern, role, a).filter(e => !inSession.has(e.name));
      if (!cands.length) continue;
      const pick = cands[(variant + shift) % cands.length];
      inSession.add(pick.name);
      let [sets, lo, hi, r1, r2, rest] = c[role];
      if (role === 'main' || role === 'sec') {
        if (a.level === 0 && a.goal !== 'general') sets = Math.max(2, sets - (role === 'sec' ? 1 : 0));
      }
      if (role === 'acc') { if (a.level === 2) sets += 1; if (a.level === 0) sets = Math.min(sets, 2); }
      if (prio || (a.priority || []).some(p => PRIORITY_PATTERN[p] === pattern)) sets += 1;
      if (a.age === '65+' || a.age === '50-64') { if (r1 != null) { r1 = Math.max(r1, 2); r2 = Math.max(r2, 3); } if (lo < 6 && role !== 'power') { lo = 6; hi = Math.max(hi, 10); } }
      if (pick.type === 't') { lo = a.level === 0 ? 20 : 30; hi = a.level === 0 ? 30 : 45; }
      if (pick.type === 'x') { lo = 30; hi = 40; }
      items.push({ name: pick.name, pattern, role, sets, lo, hi, rir: r1 == null ? null : [r1, r2], rest, timed: pick.type === 't' || pick.type === 'x' });
    }
    const max = LEN_MAX[a.len] || 6;
    // Keep the most important work when time is short: power, main, sec first.
    const order = { power: 0, main: 1, sec: 2, acc: 3, core: 4 };
    let trimmed = items;
    if (items.length > max) {
      const keep = items.map((it, i) => ({ it, i })).sort((x, y) => (order[x.it.role] - order[y.it.role]) || (x.i - y.i)).slice(0, max).map(x => x.i);
      trimmed = items.filter((_, i) => keep.includes(i));
    }
    return { key, name: name + (shift ? ' (2)' : ''), items: trimmed };
  }

  function recommend(a) {
    const days = a.days.length;
    if (a.goal === 'mobility') return { rec: 'yoga', alts: [], lift: 0 };
    const cap = a.goal === 'athletic' ? 4 : a.goal === 'general' ? (a.level === 0 ? 3 : 4) : a.level === 0 ? 4 : 6;
    const lift = Math.min(days, cap);
    let rec;
    if (a.goal === 'athletic') rec = lift <= 2 ? 'ath2' : lift === 3 ? 'ath3' : 'ath4';
    else if (lift <= 2) rec = 'fb2';
    else if (lift === 3) rec = (a.level >= 1 && (a.goal === 'muscle' || a.goal === 'strength')) ? 'ulf' : 'fb3';
    else if (lift === 4) rec = 'ul4';
    else if (lift === 5) rec = 'ulppl';
    else rec = 'ppl6';
    // Only offer splits where every session still has real work after equipment and injury swaps.
    const viable = k => SPLITS[k].seq.every(key => buildSession(key, a).items.length >= 3);
    let alts = Object.keys(SPLITS).filter(k => SPLITS[k].days === lift && k !== rec && (a.goal === 'athletic' || !k.startsWith('ath')) && (k !== 'ppl6' || a.level >= 1)).filter(viable);
    if (!viable(rec)) { const fb = alts[0] || (lift >= 4 ? 'ul4' : lift === 3 ? 'fb3' : 'fb2'); alts = alts.filter(k => k !== fb); rec = fb; }
    return { rec, alts, lift };
  }

  function cardioItem(a, n) {
    // Spare days alternate easy cardio or speed work with a yoga & mobility routine.
    if (a.goal !== 'fatloss' && n % 2 === 1) return Yoga.mobilityDay(a, Math.floor(n / 2));
    if (a.goal === 'fatloss' && n % 3 === 2) return Yoga.mobilityDay(a, Math.floor(n / 3));
    if (a.goal === 'general') return { type: 'note', name: 'Brisk walk · 30 min' };
    if (a.goal === 'fatloss') return n % 2 === 1 && a.level >= 1 ? { type: 'timer', ref: 't-hiitb', name: 'HIIT Beginner' } : { type: 'note', name: 'Cardio · 30–40 min brisk walk or cycling' };
    if (a.goal === 'athletic') return n % 2 === 0 ? { type: 'note', name: 'Speed · 6–8 × 20 m sprints, full rest' } : { type: 'timer', ref: 't-interval', name: 'Interval' };
    if (a.goal === 'general') return { type: 'note', name: n % 2 ? 'Mobility & stretching · 15–20 min' : 'Brisk walk · 30 min' };
    return { type: 'note', name: 'Easy cardio · 20–30 min (cycling is best for gains)' };
  }

  function generate(a, splitKey) {
    if (a.goal === 'mobility') {
      const rot = Yoga.planRoutines(a);
      const schedule = {};
      [1, 2, 3, 4, 5, 6, 0].filter(d => a.days.includes(d)).forEach((d, i) => { const t = rot[i % rot.length]; schedule[d] = { type: 'timer', ref: t.id, name: t.name }; });
      return { id: uid(), created: Date.now(), start: dkey(startOfWeek(new Date())), weeks: a.weeks, a: clone(a), split: 'yoga', sessions: {}, schedule };
    }
    const { rec, lift } = recommend(a);
    const sk = splitKey || rec;
    const split = SPLITS[sk];
    const order = [1, 2, 3, 4, 5, 6, 0];
    const daysSorted = order.filter(d => a.days.includes(d));
    // Spread lifting days out; extra days become cardio.
    const liftDays = spread(daysSorted, Math.min(lift, split.days));
    const sessions = {};
    split.seq.forEach(k => { sessions[k] = buildSession(k, a); });
    const schedule = {};
    let si = 0, ci = 0;
    daysSorted.forEach(d => {
      if (liftDays.includes(d)) { const k = split.seq[si % split.seq.length]; schedule[d] = { type: 'prog', key: k, name: sessions[k].name }; si++; }
      else { schedule[d] = cardioItem(a, ci++); }
    });
    return { id: uid(), created: Date.now(), start: dkey(startOfWeek(new Date())), weeks: a.weeks, a: clone(a), split: sk, sessions, schedule };
  }
  function spread(days, n) {
    if (n >= days.length) return days.slice();
    const out = []; const step = days.length / n;
    for (let i = 0; i < n; i++) out.push(days[Math.floor(i * step)]);
    return out;
  }
  function startOfWeek(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); const off = (x.getDay() - S.weekStart + 7) % 7; x.setDate(x.getDate() - off); return x; }

  function weekNo() { if (!prog) return 0; return Math.floor((today0() - parseKey(prog.start)) / (7 * 864e5)) + 1; }
  const isDeload = w => prog && prog.a.level >= 1 && w % 4 === 0;
  // Week-by-week effort: start a bit easier, push harder in week 3, deload in week 4 (intermediate+).
  function itemForWeek(it, w) {
    const x = clone(it);
    if (!prog) return x;
    if (isDeload(w)) { x.sets = Math.max(1, Math.ceil(x.sets / 2)); if (x.rir) x.rir = [3, 4]; x.deload = true; return x; }
    const phase = (w - 1) % 4;
    if (x.rir) {
      if (prog.a.level === 0 && w <= 2) x.rir = [x.rir[0] + 1, x.rir[1] + 1];
      else if (phase === 0) x.rir = [x.rir[0] + 1, x.rir[1] + 1];
      else if (phase === 2) x.rir = [Math.max(x.role === 'main' ? 1 : 0, x.rir[0] - 1), Math.max(x.role === 'main' ? 1 : 0, x.rir[1] - 1)];
    }
    return x;
  }
  const rirText = r => r == null ? 'Max speed every rep, full rest' : r[1] === 0 ? 'Go to failure on the last set' : r[0] === 0 ? `0–${r[1]} reps left (last set can go to failure)` : r[0] === r[1] ? `Stop ${r[0]} reps before failure` : `Stop ${r[0]}–${r[1]} reps before failure`;
  const repText = it => it.timed ? `${it.lo}–${it.hi} s` : `${it.lo}–${it.hi}`;
  const estMin = s => Math.round((s.items.reduce((a, it) => a + it.sets * ((it.timed ? (it.hi || 40) : 40) + it.rest), 0) - 60) / 60 + 6);

  /* ---------- progression ---------- */
  function lastSets(name) {
    const hist = log.filter(x => x.kind === 'gym' && Array.isArray(x.exercises)).sort((a, b) => b.at - a.at);
    for (const x of hist) { const e = x.exercises.find(y => y.name === name); if (e && e.sets.length) return { sets: e.sets, at: x.at }; }
    return null;
  }
  function increment(it) {
    const ex = byName(it.name); const eq = ex ? ex.eq : '';
    const lowerBig = ['squat', 'hinge'].includes(it.pattern) && (eq.includes('B') || eq.includes('M'));
    if (S.unit === 'lb') return (lowerBig ? 10 : 5) / KG_LB;
    if (eq.includes('D') && !eq.includes('B')) return 2;
    return lowerBig ? 5 : 2.5;
  }
  function suggest(it) {
    const last = lastSets(it.name);
    if (it.deload) return { w: last ? maxW(last.sets) : null, text: 'Deload week: same weight, fewer sets, easy effort' };
    if (!last) return { w: null, text: it.timed ? 'Hold with good form. Add time when it gets easy.' : `First time: pick a weight you could lift about ${it.hi + 2} times. Stop with ${it.rir ? it.rir[1] : 2} reps left.` };
    const w = maxW(last.sets);
    const work = last.sets.filter(s => (s.w || 0) >= w - 0.01);
    const allTop = work.length >= Math.min(it.sets, last.sets.length) && work.every(s => s.r >= it.hi);
    const missed = work.some(s => s.r < it.lo);
    const summ = last.sets.map(s => s.r).join(', ');
    if (!w) return { w: null, text: allTop ? `Last: ${summ} reps. Add reps or try a harder version.` : `Last: ${summ} reps. Beat at least one set today.` };
    if (allTop) { const nw = w + increment(it); return { w: nw, text: `Last: ${wOut(w)} ${wUnit()} × ${summ}. Hit the top of the range, so go up to ${wOut(nw)} ${wUnit()}.`, up: true }; }
    if (missed) return { w, text: `Last: ${wOut(w)} ${wUnit()} × ${summ}. Stay at this weight and reach ${it.lo}+ reps on every set.` };
    return { w, text: `Last: ${wOut(w)} ${wUnit()} × ${summ}. Same weight, try 1 more rep per set.` };
  }
  const maxW = sets => sets.reduce((m, s) => Math.max(m, s.w || 0), 0);

  /* ---------- illustrations ---------- */
  const P_ = (pts) => pts.map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`).join('');
  const POSES = {
    squat: { h: [60, 24], l: [[60, 31, 54, 52], [54, 52, 72, 58], [72, 58, 68, 82], [54, 52, 66, 60], [66, 60, 64, 82], [60, 36, 72, 34], [60, 36, 46, 34]], prop: '<line class="pr" x1="36" y1="33" x2="84" y2="33"/>', arrow: 'M98 40v30' },
    hinge: { h: [88, 30], l: [[82, 36, 52, 50], [52, 50, 56, 82], [52, 50, 48, 82], [76, 39, 76, 64], [70, 42, 70, 64]], prop: '<line class="pr" x1="58" y1="66" x2="90" y2="66"/>', arrow: 'M104 48c0 14-6 22-16 24' },
    lunge: { h: [58, 18], l: [[58, 25, 58, 50], [58, 50, 76, 58], [76, 58, 76, 82], [58, 50, 46, 66], [46, 66, 34, 82], [58, 30, 50, 46], [58, 30, 66, 46]], prop: '<rect class="pr" x="45" y="45" width="8" height="5" rx="1"/><rect class="pr" x="63" y="45" width="8" height="5" rx="1"/>', arrow: 'M96 40v30' },
    hpush: { h: [24, 58], l: [[30, 60, 76, 60], [76, 60, 90, 74], [90, 74, 94, 84], [44, 60, 44, 36], [56, 60, 56, 36]], prop: '<line class="pr" x1="30" y1="34" x2="70" y2="34"/><line class="bn" x1="22" y1="66" x2="84" y2="66"/>', arrow: 'M100 52V24' },
    vpush: { h: [60, 30], l: [[60, 37, 60, 62], [60, 62, 52, 86], [60, 62, 68, 86], [60, 40, 46, 26], [46, 26, 46, 12], [60, 40, 74, 26], [74, 26, 74, 12]], prop: '<line class="pr" x1="36" y1="11" x2="84" y2="11"/>', arrow: 'M98 44V18' },
    hpull: { h: [86, 34], l: [[80, 39, 50, 52], [50, 52, 54, 84], [50, 52, 46, 84], [72, 43, 64, 54], [64, 54, 70, 62]], prop: '<line class="pr" x1="60" y1="62" x2="84" y2="62"/>', arrow: 'M100 72V50' },
    vpull: { h: [60, 30], l: [[60, 37, 60, 64], [60, 64, 54, 88], [60, 64, 66, 88], [60, 40, 44, 32], [44, 32, 40, 12], [60, 40, 76, 32], [76, 32, 80, 12]], prop: '<line class="pr" x1="28" y1="11" x2="92" y2="11"/>', arrow: 'M100 50V26' },
    curl: { h: [60, 20], l: [[60, 27, 60, 56], [60, 56, 54, 86], [60, 56, 66, 86], [60, 31, 52, 48], [52, 48, 50, 34], [60, 31, 68, 48], [68, 48, 70, 34]], prop: '<rect class="pr" x="44" y="28" width="12" height="6" rx="1.5"/><rect class="pr" x="64" y="28" width="12" height="6" rx="1.5"/>', arrow: 'M96 56c0-12-4-20-12-22' },
    tri: { h: [60, 26], l: [[60, 33, 60, 60], [60, 60, 54, 88], [60, 60, 66, 88], [60, 36, 52, 18], [52, 18, 62, 10], [60, 36, 68, 18], [68, 18, 62, 10]], prop: '<rect class="pr" x="54" y="4" width="14" height="7" rx="1.5"/>', arrow: 'M96 40V16' },
    raise: { h: [60, 22], l: [[60, 29, 60, 58], [60, 58, 54, 88], [60, 58, 66, 88], [60, 33, 36, 34], [60, 33, 84, 34]], prop: '<rect class="pr" x="26" y="30" width="10" height="7" rx="1.5"/><rect class="pr" x="84" y="30" width="10" height="7" rx="1.5"/>', arrow: 'M30 58c0-10 2-16 6-20' },
    core: { h: [22, 56], l: [[28, 60, 92, 66], [34, 62, 34, 76], [34, 76, 46, 76], [92, 66, 94, 76]], prop: '<line class="bn" x1="14" y1="80" x2="106" y2="80"/>', arrow: '' },
    bridge: { h: [20, 72], l: [[26, 72, 60, 52], [60, 52, 78, 60], [78, 60, 80, 78], [32, 70, 40, 78]], prop: '<line class="bn" x1="10" y1="80" x2="106" y2="80"/>', arrow: 'M98 64V40' },
    jump: { h: [60, 14], l: [[60, 21, 60, 46], [60, 46, 50, 60], [50, 60, 52, 74], [60, 46, 70, 60], [70, 60, 68, 74], [60, 25, 46, 10], [60, 25, 74, 10]], prop: '<line class="bn" x1="22" y1="88" x2="98" y2="88"/>', arrow: 'M96 80V46' },
    carry: { h: [56, 18], l: [[56, 25, 56, 54], [56, 54, 46, 84], [56, 54, 68, 82], [56, 29, 48, 54], [56, 29, 64, 54]], prop: '<rect class="pr" x="42" y="54" width="10" height="12" rx="2"/><rect class="pr" x="60" y="54" width="10" height="12" rx="2"/>', arrow: 'M80 70h22m-6-5l6 5-6 5' },
    calf: { h: [60, 16], l: [[60, 23, 60, 52], [60, 52, 56, 80], [60, 52, 64, 80], [56, 80, 52, 86], [64, 80, 68, 86], [60, 27, 52, 50], [60, 27, 68, 50]], prop: '<line class="bn" x1="30" y1="88" x2="90" y2="88"/>', arrow: 'M98 84V60' },
    legiso: { h: [40, 28], l: [[40, 35, 44, 62], [44, 62, 74, 62], [74, 62, 96, 54], [40, 40, 54, 54]], prop: '<rect class="bn" x="30" y="64" width="40" height="6" rx="2"/>', arrow: 'M102 76V52' },
  };
  const POSE_FOR = { squat: 'squat', hinge: 'hinge', lunge: 'lunge', hpush: 'hpush', chest: 'hpush', vpush: 'vpush', hpull: 'hpull', rdelt: 'hpull', vpull: 'vpull', bi: 'curl', tri: 'tri', sdelt: 'raise', core: 'core', glute: 'bridge', power_l: 'jump', power_u: 'hpush', carry: 'carry', calf: 'calf', quad: 'legiso', ham: 'legiso' };
  function figure(pattern, name) {
    let key = POSE_FOR[pattern] || 'squat';
    if (name && /Hip Thrust|Glute Bridge/.test(name)) key = 'bridge';
    if (name && /Push-up/.test(name)) key = 'core';
    const p = POSES[key];
    return `<svg class="fig" viewBox="0 0 120 96" aria-hidden="true"><g class="body">${P_(p.l)}<circle cx="${p.h[0]}" cy="${p.h[1]}" r="6.5"/></g><g class="props">${p.prop}</g>${p.arrow ? `<path class="arr" d="${p.arrow}"/>` : ''}</svg>`;
  }

  /* ---------- guide sheet ---------- */
  function youtube(name) {
    const url = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' exercise proper form');
    if (isNative) window.location.href = url; else window.open(url, '_blank', 'noopener');
  }
  function guide(name) {
    const e = byName(name);
    const s = sheet(`<h2>${esc(name)}</h2><p class="sub">${e ? esc(MUSCLES[e.pattern] || '') : 'Custom exercise'}</p>
      ${e ? `<div class="guide-fig">${figure(e.pattern, e.name)}</div>
      <div class="cues">${e.cues.map((c, i) => `<div class="cue"><b>${i + 1}</b><span>${esc(c)}</span></div>`).join('')}</div>` : ''}
      <div class="btns"><button class="btn" data-a="yt">${ic('play')}Watch demos on YouTube</button></div>`);
    s.el.addEventListener('click', ev => { if (ev.target.closest('[data-a="yt"]')) youtube(name); });
  }

  /* ---------- quiz ---------- */
  function defaults(init) {
    if (init) return clone(init);
    return prog ? clone(prog.a) : { goal: 'muscle', level: 0, days: [1, 3, 5], len: 60, where: 'gym', equip: [], age: '18-29', sex: 'na', avoid: [], priority: [], weeks: 8, remindOn: true, time: '07:00', split: null };
  }
  function openQuiz(init) {
    const a = defaults(init);
    let step = 0;
    const STEPS = 6;
    const scr = el(`<section class="screen quiz">
      <header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Close">${ic('close')}</button></div><h1>Build My Program</h1></header>
      <div class="qprog"><i id="qbar"></i></div>
      <div class="scroll"><div class="page" id="qz"></div></div>
      <div class="gym-bar"><button class="btn" data-a="back">Back</button><button class="btn primary" data-a="next" id="qnext">Next</button></div>
    </section>`);
    const qz = $('#qz', scr);
    const opt = (k, v, title, sub, icon, multi) => {
      const on = multi ? (a[k] || []).includes(v) : a[k] === v;
      return `<button class="qopt ${on ? 'on' : ''}" data-k="${k}" data-v="${esc(String(v))}" data-m="${multi ? 1 : 0}">${icon ? `<span class="qi">${ic(icon)}</span>` : ''}<span class="qt"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</span><span class="qc">${ic('check')}</span></button>`;
    };
    const chip = (k, v, label, multi) => { const on = multi ? (a[k] || []).includes(v) : a[k] === v; return `<button class="chip small ${on ? 'on' : ''}" data-k="${k}" data-v="${esc(String(v))}" data-m="${multi ? 1 : 0}">${esc(label)}</button>`; };
    const paint = () => {
      $('#qbar', scr).style.width = ((step + 1) / STEPS * 100) + '%';
      $('[data-a="back"]', scr).style.visibility = step ? 'visible' : 'hidden';
      $('#qnext', scr).textContent = step === STEPS - 1 ? 'Build my program' : 'Next';
      let h = '';
      if (step === 0) h = `<p class="qh">What's your main goal?</p>${Object.entries(GOALS).map(([k, g]) => opt('goal', k, g.name, g.d, g.icon)).join('')}`;
      if (step === 1) h = `<p class="qh">How experienced are you with strength training?</p>${LEVELS.map((l, i) => opt('level', i, l.name, l.d, ['run', 'dumbbell', 'trophy'][i])).join('')}<p class="hint">Not sure? Pick the lower level. The app suggests moving up when your logs show steady progress.</p>`;
      if (step === 2) h = `<p class="qh">Which days can you train?</p><div class="presets" style="justify-content:flex-start">${[1, 2, 3, 4, 5, 6, 0].map(d => chip('days', d, WDL[d].slice(0, 3), true)).join('')}</div>
        <p class="hint">${a.days.length} day${a.days.length === 1 ? '' : 's'} selected. Pick 2 to 6. More days than needed for lifting become cardio or recovery days.</p>
        <p class="qh" style="margin-top:18px">How long per session?</p><div class="presets" style="justify-content:flex-start">${[30, 45, 60, 75].map(m => chip('len', m, m === 75 ? '75+ min' : m + ' min')).join('')}</div>
        <p class="qh" style="margin-top:18px">Reminder on training days</p><div class="remind" style="gap:12px"><input type="time" id="qtime" value="${esc(a.time)}" ${a.remindOn ? '' : 'disabled'}><button data-a="rem"><span class="toggle sm ${a.remindOn ? 'on' : ''}"></span></button></div>`;
      if (step === 3) h = `<p class="qh">Where will you train?</p>${opt('where', 'gym', 'Gym', 'Barbells, dumbbells, machines and cables', 'dumbbell')}${opt('where', 'home', 'Home', 'Choose what you have below', 'home')}
        ${a.where === 'home' ? `<p class="qh" style="margin-top:14px">What equipment do you have?</p>${opt('equip', 'D', 'Dumbbells', 'Adjustable or a few pairs', null, true)}${opt('equip', 'N', 'Bench', 'Flat or adjustable', null, true)}${opt('equip', 'R', 'Resistance bands', 'With handles or a door anchor', null, true)}${opt('equip', 'P', 'Pull-up bar', 'Doorway or wall-mounted', null, true)}<p class="hint">Nothing ticked means a bodyweight-only plan.</p>` : ''}`;
      if (step === 4) h = `<p class="qh">Age group</p><div class="presets" style="justify-content:flex-start">${['18-29', '30-49', '50-64', '65+'].map(x => chip('age', x, x)).join('')}</div>
        <p class="qh" style="margin-top:18px">Sex</p><div class="presets" style="justify-content:flex-start">${[['m', 'Male'], ['f', 'Female'], ['na', 'Prefer not to say']].map(([v, l]) => chip('sex', v, l)).join('')}</div>
        <p class="hint">The plan is the same for everyone. This is only used for calorie estimates.</p>
        <p class="qh" style="margin-top:18px">Any areas to go easy on?</p><div class="presets" style="justify-content:flex-start">${[['k', 'Knees'], ['b', 'Lower back'], ['s', 'Shoulders'], ['w', 'Wrists']].map(([v, l]) => chip('avoid', v, l, true)).join('')}</div>
        <p class="hint">The app swaps in gentler exercises. This is not medical advice. If something hurts, check with a doctor or physio.</p>
        <p class="qh" style="margin-top:18px">Muscles to prioritise (up to 2)</p><div class="presets" style="justify-content:flex-start">${Object.keys(PRIORITY_PATTERN).map(p => chip('priority', p, p, true)).join('')}</div>`;
      if (step === 5) {
        const r = recommend(a);
        if (!a.split || !(a.split === r.rec || r.alts.includes(a.split))) a.split = r.rec;
        h = `<p class="qh">Your recommended split</p>
          ${[r.rec, ...r.alts].map(k => `<button class="qopt split ${a.split === k ? 'on' : ''}" data-k="split" data-v="${k}" data-m="0"><span class="qt"><b>${esc(SPLITS[k].name)}${k === r.rec ? ' <em>Recommended</em>' : ''}</b><span>${esc(SPLITS[k].why)}</span></span><span class="qc">${ic('check')}</span></button>`).join('')}
          ${a.goal !== 'mobility' && a.days.length > r.lift ? `<p class="hint">${a.days.length - r.lift} of your ${a.days.length} days become ${a.goal === 'athletic' ? 'speed & conditioning' : a.goal === 'general' ? 'walking & mobility' : 'cardio'} days, so you recover well${a.level === 0 ? ' while you are new to lifting' : ''}.</p>` : ''}
          <p class="qh" style="margin-top:18px">Program length</p><div class="presets" style="justify-content:flex-start">${chip('weeks', 8, '8 weeks')}${chip('weeks', 12, '12 weeks')}</div>
          <p class="hint">${a.goal === 'mobility' ? 'Routines rotate through your training days. Rebuild the plan when it ends to keep it fresh.' : a.level >= 1 ? 'Every 4th week is a lighter deload week so you recover and keep progressing.' : 'You add weight or reps steadily each week. Beginners progress fastest.'}</p>`;
      }
      qz.innerHTML = h;
      $('.scroll', scr).scrollTop = 0;
    };
    const close = () => { unback(); scr.remove(); };
    const unback = pushBack(close);
    scr.addEventListener('change', e => { if (e.target.id === 'qtime') a.time = e.target.value || '07:00'; });
    scr.addEventListener('click', e => {
      const b = e.target.closest('[data-k],[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.a === 'rem') { a.remindOn = !a.remindOn; return paint(); }
      if (b.dataset.a === 'back') { step = Math.max(0, step - 1); if (step === 3 && a.goal === 'mobility') step = 2; return paint(); }
      if (b.dataset.a === 'next') {
        if (step === 2 && (a.days.length < 2 || a.days.length > 6)) { toast('Pick between 2 and 6 days'); return; }
        if (step < STEPS - 1) { step++; if (step === 3 && a.goal === 'mobility') step = 4; return paint(); }
        close(); return preview(generate(a, a.split));
      }
      const k = b.dataset.k; let v = b.dataset.v;
      if (['level', 'len', 'weeks', 'days'].includes(k)) v = +v;
      if (b.dataset.m === '1') {
        const arr = a[k] = a[k] || [];
        const i = arr.indexOf(v);
        if (i >= 0) arr.splice(i, 1); else { if (k === 'priority' && arr.length >= 2) { toast('Pick up to 2'); return; } arr.push(v); }
      } else a[k] = v;
      if (k === 'goal' || k === 'level' || k === 'days') a.split = null;
      paint();
    });
    paint();
    layer.appendChild(scr);
  }

  /* ---------- program overview ---------- */
  function overviewHtml(p, { preview: isPrev } = {}) {
    const a = p.a;
    const w = isPrev ? 1 : Math.min(weekNo(), p.weeks);
    const sch = [0, 1, 2, 3, 4, 5, 6].map(i => (i + S.weekStart) % 7);
    const doneKeys = new Set(log.filter(x => x.prog && x.prog.id === p.id).map(x => `${x.prog.week}:${x.prog.key}`));
    return `
      <div class="prog-head">
        <div class="k">${esc(GOALS[a.goal].name)} · ${esc(LEVELS[a.level].name)}${a.goal === 'mobility' ? '' : ` · ${a.where === 'gym' ? 'Gym' : 'Home'}`}</div>
        <div class="t">${esc(SPLITS[p.split].name)}</div>
        <p>${esc(SPLITS[p.split].why)}</p>
        ${isPrev ? '' : `<div class="wk"><div class="wkbar"><i style="width:${Math.min(100, w / p.weeks * 100)}%"></i></div><span>Week ${w} of ${p.weeks}${isDeload(w) ? ' · Deload' : ''}</span></div>`}
      </div>
      <div class="sect">Your week</div>
      <div class="block" style="padding:0">${sch.map(d => {
        const it = p.schedule[d];
        const done = it && it.type === 'prog' && doneKeys.has(`${w}:${it.key}`);
        return `<div class="dayitem" style="padding:12px 16px"><span style="flex:none;width:44px;font-weight:800;color:${it ? 'var(--accent-text)' : 'var(--faint)'}">${WD[d]}</span><span style="color:${it ? 'var(--text)' : 'var(--muted)'}">${it ? esc(it.name) : 'Rest'}${it && it.type === 'prog' ? ` <small style="color:var(--muted);font-weight:500">· ~${estMin(p.sessions[it.key])} min</small>` : it && it.type === 'timer' && findTimer(it.ref) ? ` <small style="color:var(--muted);font-weight:500">· ${Math.round(totalOf(findTimer(it.ref)) / 60)} min</small>` : ''}</span>${done ? `<span class="okmark">${ic('check')}</span>` : ''}</div>`;
      }).join('')}</div>
      ${(() => { const ids = [...new Set(Object.values(p.schedule).filter(x => x && x.type === 'timer' && Yoga.timers.some(t => t.id === x.ref)).map(x => x.ref))]; return ids.length ? `<div class="sect">Yoga &amp; mobility routines</div><div class="block" style="padding:0">${ids.map(id => { const t = findTimer(id); return `<button class="exrow" data-yr="${id}">${Yoga.figure((t.sets[t.sets.length - 1].intervals[0] || {}).pose)}<span class="en"><b>${esc(t.name)}</b><span>${Math.round(totalOf(t) / 60)} min · ${esc(t.desc)}</span></span>${ic('chevR', 'chev')}</button>`; }).join('')}</div>` : ''; })()}
      ${Object.values(p.sessions).map(s => `
        <div class="sect"><span>${esc(s.name)}</span><span style="text-transform:none;letter-spacing:0">${s.items.length} exercises · ~${estMin(s)} min</span></div>
        <div class="block" style="padding:0">${s.items.map(it => { const x = isPrev ? it : itemForWeek(it, w); return `<button class="exrow" data-guide="${esc(it.name)}">${figure(it.pattern, it.name)}<span class="en"><b>${esc(it.name)}</b><span>${x.sets} × ${repText(x)} · rest ${fmtShort(x.rest)}${x.rir ? '' : ' · power'}</span></span>${ic('chevR', 'chev')}</button>`; }).join('')}</div>`).join('')}
      <p class="hint" style="margin-top:14px">${a.goal === 'mobility' ? 'Move slowly and breathe. Ease off any pose that pinches or hurts. Tap a routine to see every pose.' : 'Warm up 5 minutes before each session, then do 1–2 lighter sets of the first exercise. Tap any exercise for form tips.'}</p>`;
  }

  function preview(p) {
    const scr = el(`<section class="screen">
      <header class="topbar"><div class="tb-left"><button class="round-btn" data-a="close" aria-label="Close">${ic('close')}</button></div><h1>Your Program</h1></header>
      <div class="scroll"><div class="page" style="padding-bottom:30px">${overviewHtml(p, { preview: true })}</div></div>
      <div class="gym-bar"><button class="btn" data-a="edit">Change answers</button><button class="btn primary" data-a="start">Start program</button></div>
    </section>`);
    const close = () => { unback(); scr.remove(); };
    const unback = pushBack(close);
    scr.addEventListener('click', async e => {
      const g = e.target.closest('[data-guide]'); if (g) return guide(g.dataset.guide);
      const yr = e.target.closest('[data-yr]'); if (yr) return Yoga.showRoutine(yr.dataset.yr);
      const b = e.target.closest('[data-a]'); if (!b) return;
      if (b.dataset.a === 'close') return close();
      if (b.dataset.a === 'edit') { close(); openQuiz(p.a); return; }
      if (b.dataset.a === 'start') {
        if (hasPlan() && !(await confirmBox('Replace your weekly plan?', 'Your training days and reminders will be set from this program. You can still edit them later.', [{ label: 'Start program', cls: 'primary', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }]))) return;
        apply(p); close();
        timersSeg = 'prog'; go('today');
        toast('Program started. Today’s session is on the Today screen.');
      }
    });
    layer.appendChild(scr);
  }

  function apply(p) {
    prog = p; save();
    const old = plan;
    plan = emptyPlan();
    for (let d = 0; d < 7; d++) {
      const it = p.schedule[d];
      plan[d].rest = !it;
      plan[d].items = it ? [clone(it)] : [];
      plan[d].remind = !!it && p.a.remindOn;
      plan[d].time = (old && old[d] && old[d].time && old[d].remind) ? old[d].time : p.a.time;
    }
    savePlan();
    scheduleReminders();
  }

  function end() { prog = null; DB.del('program'); }

  /* ---------- today / gym integration ---------- */
  function sessionDraft(key) {
    if (!prog || !prog.sessions[key]) return null;
    const w = Math.min(weekNo(), prog.weeks);
    const s = prog.sessions[key];
    return {
      title: s.name, prog: { id: prog.id, key, week: w, deload: isDeload(w) },
      exercises: s.items.map(it => {
        const x = itemForWeek(it, w);
        const sg = suggest(x);
        return { name: x.name, sets: Array.from({ length: x.sets }, () => ({ w: null, r: 0, done: false })), t: { sets: x.sets, lo: x.lo, hi: x.hi, rir: x.rir, rest: x.rest, timed: x.timed, pattern: x.pattern, hint: sg.text, sw: sg.w, up: !!sg.up } };
      }),
    };
  }
  function targetHtml(t) {
    return `<div class="tgt"><span class="tg">${t.sets} × ${t.timed ? `${t.lo}–${t.hi} s` : `${t.lo}–${t.hi}`}</span><span>${esc(rirText(t.rir))}</span></div>
      <div class="sug ${t.up ? 'up' : ''}">${t.up ? ic('chevU') : ic('info')}<span>${esc(t.hint)}</span></div>`;
  }

  function programCardHtml() {
    if (!prog) {
      return `<button class="prog-cta" data-a="prog-new"><span class="qi">${ic('sliders')}</span><span style="flex:1;min-width:0"><b>Get a personalised program</b><span>Answer 6 quick questions. The app picks your split, exercises, sets and reps.</span></span>${ic('chevR', 'chev')}</button>`;
    }
    const w = weekNo();
    if (w > prog.weeks) {
      return `<div class="prog-cta done"><span class="qi">${ic('trophy')}</span><span style="flex:1;min-width:0"><b>Program complete! 🎉</b><span>${prog.weeks} weeks of ${esc(SPLITS[prog.split].name)} done. Start the next block.</span></span><button class="go" data-a="prog-next">Next block</button></div>`;
    }
    return '';
  }
  function levelNudge() {
    if (!prog || prog.a.level !== 0) return '';
    const n = log.filter(x => x.prog && x.prog.id === prog.id).length;
    const total = log.filter(x => x.kind === 'gym' && x.at > Date.now() - 120 * 864e5).length;
    if (n < 20 && total < 30) return '';
    return `<button class="nudge" data-a="prog-level">${ic('trophy')}<span><b>Ready for Intermediate?</b> You've logged ${Math.max(n, total)} gym sessions recently. Tap to rebuild your program with more volume and deload weeks.</span></button>`;
  }
  function nextBlock(levelUp) {
    const a = clone(prog.a);
    if (levelUp && a.level < 2) a.level += 1;
    a.split = null;
    preview(generate(a));
  }

  function viewTab(container) {
    if (!prog) {
      container.innerHTML = `${artCard('rings', 'A plan you follow beats a perfect plan you don’t.', { small: true })}
        <div class="empty" style="padding:16px 10px"><b>No program yet</b>Answer 6 quick questions about your goal, level, days and equipment. The app builds a split with exercises, sets, reps and rest based on current training research.</div>
        <button class="btn primary" data-a="prog-new">Build my program</button>`;
      return;
    }
    container.innerHTML = `${programCardHtml()}${levelNudge()}${overviewHtml(prog)}
      <div class="btns two" style="margin-top:16px"><button class="btn" data-a="prog-new">Rebuild</button><button class="btn danger" data-a="prog-end">End program</button></div>`;
  }
  async function handleAction(a, el) {
    if (a === 'prog-new') return openQuiz();
    if (a === 'prog-next') return nextBlock(false);
    if (a === 'prog-level') return nextBlock(true);
    if (a === 'prog-end') {
      if (await confirmBox('End this program?', 'Your logged workouts stay. Program days are removed from your weekly plan.', [{ label: 'End program', cls: 'danger', value: 1 }, { label: 'Cancel', cls: 'ghost', value: 0 }])) {
        end();
        if (plan) { for (let d = 0; d < 7; d++) plan[d].items = (plan[d].items || []).filter(i => i.type !== 'prog'); savePlan(); scheduleReminders(true); }
        rerenderKeepScroll(); toast('Program ended');
      }
      return;
    }
    if (el && el.dataset.guide) return guide(el.dataset.guide);
  }

  return {
    get current() { return prog; },
    set current(v) { prog = v; },
    openQuiz, guide, sessionDraft, targetHtml, programCardHtml, levelNudge, viewTab, handleAction, weekNo, estMin, figure, byName,
    sessionInfo: key => (prog && prog.sessions[key] ? { name: prog.sessions[key].name, n: prog.sessions[key].items.length, min: estMin(prog.sessions[key]), week: Math.min(weekNo(), prog.weeks), weeks: prog.weeks, deload: isDeload(weekNo()) } : null),
    // for tests
    _generate: generate, _recommend: recommend, _EX: EX,
  };
})();
