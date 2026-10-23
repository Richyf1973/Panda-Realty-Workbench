# Cooling-Off Period on Offers & Contracts — Questions Before I Build

Hi Richard,

Before I build the cooling-off changes you described, I want to nail down a few things so the number of days lands correctly on every contract. Could you answer these in your own words. The more detail you give, the closer I can match what you picture.

---

## Background

Right now the offer form is the same for every property, and it only asks the buyer one yes/no question: do you want to waive the cooling-off period? If they say yes, it drops to zero. The form already mentions "5 days for residential, 21 days for manufactured homes" as wording, but nothing in the system actually knows which one a property is, and the number of days never gets written into the contract conditions today.

You want two things: (1) the system to know whether a property is a normal house or a manufactured home so it uses the right starting number, and (2) a way to handle the manufactured-home rule where a buyer can only waive part of the period (up to 14 of the 21 days, never below 7). Below are the decisions I need from you to get this right.

---

## Questions

1. How should we tell which homes are manufactured homes? At the moment our property records come straight from the council/import data, and none of them are labelled "manufactured home" — so the system has no way to know on its own. Would you rather we add a simple "this is a manufactured home" marker that someone ticks on each property record, or would you rather the agent just chooses the contract type at the moment they create the offer? Whichever feels less error-prone to you in day-to-day use is what I'll lean toward.

2. Who decides and enters the waiver, and when — the buyer filling in the public offer form, or your team in the back office afterwards? For a normal house it's simple (waive the 5 days or keep them). But for a manufactured home the buyer can waive *some* of the days — anywhere from none up to 14 — leaving at least 7. Should the buyer be able to type how many days they want to waive on the form, or is that a conversation your team has and then enters themselves?

3. For a manufactured home, how do you want the waiver question to actually read for the buyer, so it's clear they can only partly waive it? For example, should it ask "how many days would you like to waive (up to 14)?", or "how many cooling-off days would you like to keep (minimum 7)?" — whichever way you think a buyer is least likely to get confused.

4. What should the cooling-off line actually say once it appears in the contract conditions? Could you give me the exact wording you'd want for each case — a normal house with the full 5 days, a normal house where it's been waived, a manufactured home with the full 21 days, and a manufactured home where, say, 10 days were waived leaving 11? Seeing your preferred sentences means I can drop them straight in.

5. When you say "days", do you mean calendar days or business days? Your current contract signing page says "5 business days", but the rest of the system has been counting plain calendar days. I want to make sure the deadline dates we calculate (and the reminders that get added to the calendar) match what's legally correct for each contract type.

6. Are there any cases where there should be *no* cooling-off period at all, or a different number than the 5 or 21 we've discussed — for instance certain buyers, cash purchases, or specific situations where the rule doesn't apply? I'd rather know now than discover an exception later.

---

_Answer each one in your own words, in any order. No need to keep it short, and feel free to add anything I have not asked about._
