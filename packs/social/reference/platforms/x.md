# X

## What this feed rewards

January 2026 rebuilt the ranking system from scratch on a Grok powered model; the old For You heuristics are gone, replaced by prediction across three pooled sources: accounts you follow, out of network content the model predicts you will like, and interest graph matches. Reply weight is enormous: a reply counts roughly 27 times a like, and a genuine back and forth conversation counts roughly 150 times a like. A post with 50 real replies will outrank one with 500 likes and no discussion. Community Notes attached within the first 48 hours materially affect distribution in both directions: a note adding credible context can boost reach, a note flagging something false kills it. The external link penalty is gone as of October 2025; a link no longer tanks reach the way it did through most of 2025. Single long form posts now outrank multi post threads for distribution; the era of fragmenting one idea across ten posts for reach is over.

## Formats

Image: 16:9 (1600x900) gets the largest in feed preview; 4:5 (1080x1350) and 1:1 (1080x1080) both work and read well on mobile.

Video: 16:9 (1920x1080), 1:1 (1080x1080) and 9:16 (1080x1920) are all supported; 9:16 reads best on mobile first feeds. Standard accounts cap out at 140 seconds; longer runtime needs a paid tier.

Long form single post: up to 280 characters on a standard account, up to 25,000 on a paid tier. Use the room for one idea done well rather than a thread of ten.

Threads: still useful for a genuine step by step build; 5 to 8 posts is the completion rate sweet spot. Default to a single long form post unless the idea truly needs the turn the page structure.

The framework's compositor exports 1:1, 4:5 and 9:16 from one generated scene; default to 16:9 or 1:1 for X image posts, since those claim the largest timeline preview.

## Copy norms

Hook in the first line, no exceptions; on a feed this reply driven, the opening has to earn a response, not just a glance. Register is plain and direct. Emoji sparingly, mostly as punctuation, never as a substitute for a real opinion.

Hashtags do almost nothing here now; interest graph matching makes topic hashtags mostly redundant. Skip them, or use one at most if it is a genuinely active tag.

Links are safe in caption again, no surcharge and no shadow throttle. A post that is only a link with no stated opinion still underperforms a post that states a take and links as evidence.

## What gets punished

Engagement bait ("reply with your take", generic "thoughts?") reads as low quality to the new ranking model and gets suppressed. Posts that draw a credible Community Note lose distribution fast; anything stated as fact should survive a fact check before it goes out. Threads that fragment one idea across many posts purely for reach, rather than because the structure earns it, now underperform a single well written post. Reply bait rows, asking followers to flood replies with junk, look identical to bot behavior to the ranking model and get discounted the same way.

## Automation posture

Scheduling original posts through the official X API is standard and safe; most schedulers handle this natively. Automated replying, automated liking, and follow or unfollow automation are all detectable by the same model that now weighs conversation quality, and accounts running them lose reach even before any enforcement action lands.

Safe to automate: publishing on a schedule. Needs a human hand: replies, since reply quality is now the single heaviest ranking signal on the platform and a scripted reply reads as exactly that.

## Cadence default

Quality over frequency: a reliable 3 to 5 posts a week that each earn real replies outperforms a daily post that doesn't. Daily is fine only when there is genuinely daily worthy material.

Best windows: weekday mornings and the lunch hour tend to catch the most active reply windows; evenings work for more casual, conversational posts. Verify against your own analytics.

## The stop test here

A scroll stopping X post states an opinion plainly enough that a stranger wants to argue or agree with it in the replies. If nobody would reply, the algorithm will not carry it, no matter how many people see it.
