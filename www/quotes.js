/* Muscle & Money: quote bank. Adds to QUOTES from app.js; one is picked at random each time a card is drawn. */
'use strict';
(() => {
  const more = {
    train: [
      'Your body can do it. Convince your mind.', 'Earn your rest day.', 'Lift heavy, live light.', 'Progress, not perfection.', 'Every rep is a vote for who you want to be.',
      'Start where you are. Use what you have.', 'The weight won’t lift itself.', 'Tired is temporary. Proud lasts.', 'Make your future self thankful.', 'Hard work hides in plain sight. So does laziness.',
      'You are one workout away from a better mood.', 'Strong body, calm mind.', 'Fall in love with the process.', 'Train like nobody is watching.', 'Motivation gets you started. Habit keeps you going.',
      'Excuses don’t burn calories.', 'Do it for the version of you that is waiting.', 'The bar doesn’t care about your mood.', 'Good things come to those who sweat.', 'Push today, glow tomorrow.',
      'Don’t wish for it. Work for it.', 'A little progress each day adds up.', 'Your only competition is yesterday’s you.', 'Breathe in strength, breathe out doubt.', 'Ten minutes is better than zero.',
      'You never regret a workout.', 'Slow reps build fast results.', 'Form first. Ego last.', 'If it doesn’t challenge you, it won’t change you.', 'Strength grows in the moments you want to quit.',
      'Train hard. Recover harder.', 'The gym is where stress goes to lose.', 'Today is a good day to get stronger.', 'Move with purpose.', 'Build the body that carries your dreams.',
      'Make sweat your accessory.', 'Show your muscles who’s boss.', 'Small plates still add up.', 'Do the reps. Trust the plan.', 'Consistency is the real cheat code.',
      'You don’t need a new year. You need a new set.', 'Champions train when no one is clapping.', 'Every drop of sweat counts.', 'Start the set. The rest follows.', 'Be proud of every step.',
      'Your pace is perfect as long as you keep going.', 'Pain of discipline weighs ounces. Regret weighs tons.', 'Wake up. Work out. Repeat.', 'Results love routine.', 'Today’s workout is tomorrow’s confidence.',
    ],
    rest: [
      'Muscles grow while you rest.', 'Recovery is training too.', 'Slow down to speed up.', 'A rested body lifts more.', 'Sleep is the best supplement.', 'Stretch, breathe, reset.',
      'Rest is not quitting. It’s refuelling.', 'Listen to your body today.', 'Today you rebuild.', 'Calm muscles, clear mind.', 'Take a walk, not a break from yourself.', 'Good sleep, great lifts.',
      'Let today be gentle.', 'Water, food, sleep. Repeat.', 'Your body thanks you for this day off.', 'Recharge. Tomorrow we go again.', 'Mobility today, strength tomorrow.', 'Rest well, rise strong.',
      'Peace is productive too.', 'Unplug, unwind, recover.', 'A quiet day builds a loud comeback.', 'Rest days are part of the plan.', 'Breathe deeper than yesterday.', 'Recovery is where the magic happens.',
    ],
    progress: [
      'Look how far you’ve come.', 'Small wins every week.', 'Numbers go up when you keep showing up.', 'Trust the trend, not one day.', 'Progress is quiet. Keep going.',
      'Every chart starts with a single dot.', 'Strength is a slow story. Keep writing.', 'You are building something that lasts.', 'One percent better each week is a lot by the year’s end.', 'Measure, adjust, repeat.',
      'The mirror lies. The logbook doesn’t.', 'Celebrate the boring weeks too.', 'Your streak is your superpower.', 'A plateau is a place to catch your breath.', 'Keep the chain unbroken.',
      'Proof beats feelings.', 'You are stronger than last month.', 'Patience builds muscle.', 'Steady wins.', 'Data, discipline, results.',
    ],
    done: [
      'Workout done. That’s a win.', 'You showed up. That matters most.', 'Another brick in the wall.', 'Proud of you. Now recover well.', 'Strong work today!', 'One step closer.',
      'That’s how it’s done.', 'Saved. Sweat earned.', 'Done is better than perfect.', 'Future you says thanks.', 'Great session. Eat, hydrate, rest.', 'You kept your promise to yourself.',
      'Another day, another victory.', 'Hard part done. Enjoy the glow.', 'That effort counts.', 'Logged and loved.', 'Today’s goal: crushed.', 'Streak alive. Keep it going.',
    ],
    money: [
      'Pay yourself first.', 'Small savings, big freedom.', 'Track it to tame it.', 'A budget is telling your money where to go.', 'Wants can wait. Goals can’t.', 'Spend on what you love, cut what you don’t.',
      'Every rupee has a job.', 'Rich is a habit, not a moment.', 'Save the raise, live the same.', 'Need, want or savings? Decide before you pay.', 'An emergency fund buys peace of mind.', 'Little leaks sink big ships.',
      'Invest in yourself first.', 'Know where your money went this week.', 'Delay a purchase 24 hours. Then decide.', 'Your future self is your best client.', 'Freedom is built ₹100 at a time.', 'Compound interest loves patience.',
      'Cash flow is the heartbeat of a plan.', 'Spend less than you earn. Repeat forever.',
    ],
    life: [
      'Do one thing today your future self will thank you for.', 'Make it happen, shock everyone.', 'Little by little, a little becomes a lot.', 'You can do hard things.', 'Focus on what you can control.',
      'Be the energy you want to attract.', 'Start before you are ready.', 'Done beats perfect.', 'Win the morning, win the day.', 'Your habits shape your future.',
      'Be kind, work hard, stay humble.', 'Make today count.', 'Dream big, start small, act now.', 'Clarity comes from action.', 'Choose progress over comfort.',
      'Write it down. Then do it.', 'Plan the day or the day plans you.', 'Gratitude turns enough into plenty.', 'One task at a time.', 'Your time is your life. Spend it well.',
      'Keep promises to yourself.', 'Stay curious.', 'A calm mind makes better choices.', 'Discipline is self-respect in action.', 'Be patient with yourself.',
      'The best time to start was yesterday. The next best is now.', 'Simplify. Then simplify again.', 'Don’t count the days. Make the days count.', 'Courage is a muscle too.', 'Small daily wins build big lives.',
      'Less scrolling, more living.', 'Your vibe sets your tribe.', 'Do it with passion or not at all.', 'Make space for what matters.', 'Every day is a fresh page.',
      'You are the author of your story.', 'Rise with purpose.', 'Act like the person you want to become.', 'Energy flows where attention goes.', 'Breathe. You’ve got this.',
      'Good habits are worth more than good intentions.', 'Start small. Stay consistent.', 'Busy is not the same as productive.', 'Turn “someday” into “today”.', 'Your future is created by what you do today.',
      'Protect your peace.', 'Make the hard call early.', 'Say no to the good to say yes to the great.', 'Show up for yourself.', 'Keep going. You’re doing better than you think.',
    ],
  };
  Object.entries(more).forEach(([k, list]) => { QUOTES[k] = (QUOTES[k] || []).concat(list.filter(q => !(QUOTES[k] || []).includes(q))); });
})();
