// Local, prewritten joke templates. No AI service or account is required.
const templates = [
 i=>`Put ${i} in charge. Insist it has twelve years of management experience.`,
 i=>`Bring ${i}, declare the situation a rehearsal, and demand everyone try again with more feeling.`,
 i=>`Offer ${i} as a peace treaty. If that fails, promote it to chief negotiator.`,
 i=>`Start a support group for ${i}. Make this everyone else's problem by Thursday.`,
 i=>`Present ${i} as your lawyer. Refuse to answer questions without it present.`,
 i=>`Hold a press conference with ${i}. Say “we are monitoring the situation” until everyone goes home.`,
 i=>`Put ${i} on a velvet cushion and announce that this was the plan all along.`,
 i=>`Sell tickets to see ${i} fix it. Use the ticket money to move to another town.`,
 i=>`Ask ${i} for a second opinion. Nod thoughtfully, then do an unnecessary victory lap.`,
 i=>`Give ${i} a name badge that says “Supervisor.” Immediately take your lunch break.`,
 i=>`Use ${i} to start a parade in the opposite direction. Nobody questions a parade.`,
 i=>`Blame ${i}. Look disappointed and say you expected better from the team.`,
 i=>`Write a musical starring ${i}. This is now the dramatic conflict in Act Two.`,
 i=>`Make ${i} employee of the month. Announce that all complaints must go through human resources.`,
 i=>`Arrive with ${i}, whisper “the prophecy was true,” and leave before anyone asks which prophecy.`,
 i=>`Challenge ${i} to a dance-off. Lose on purpose so everyone feels awkward for a different reason.`,
 i=>`Build a museum exhibit around ${i}. Charge extra for the audio guide explaining this terrible decision.`,
 i=>`Give ${i} a five-star review. Include “saved my entire day” and absolutely no evidence.`,
 i=>`Form a committee with ${i}. Schedule the first meeting for a date that does not exist.`,
 i=>`Announce that ${i} is a surprise guest judge. Ask everyone to look busy.`,
 i=>`Wrap ${i} in gift paper and call it an apology. The bow is legally binding.`,
 i=>`Make ${i} your official spokesperson. Say the silence is a very powerful statement.`,
 i=>`Take ${i} on a motivational retreat. Return with matching T-shirts and no actual solution.`,
 i=>`Use ${i} as the grand prize in a competition nobody remembers entering.`
];
export function computerAdvice(ingredient,choice){return templates[choice%templates.length](ingredient)}
export const computerTemplateCount=templates.length;
