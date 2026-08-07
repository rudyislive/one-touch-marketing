# Reddit

## What this feed rewards

Reddit ranks on genuine engagement inside a specific community, not follower count or brand recognition; a post that would not survive being read by that subreddit's regulars will not survive the vote. Comment karma and account history matter more than post karma, because moderators and AutoModerator configs weight comment activity heavily; it is harder to fake than an upvoted link. A Contributor Quality Score (CQS) runs under every account; new accounts start at Moderate, and many major subreddits now filter Low and Lowest CQS accounts out of visibility entirely. Posting too fast across too many subs, farming karma in free karma communities, or getting removed for spam all damage it.

Native, unpolished framing, a real question, a real result, a real mistake, consistently outperforms anything that reads like marketing copy dropped into a community.

## Formats

Text post: the default for discussion driven subreddits; no image required, the title and body carry the whole post. Image post: a single image or gallery at roughly 1:1 or 4:5 reads cleanly in both old and new Reddit UI; extreme aspect ratios crop awkwardly in the card view. Link post: works where the subreddit allows it, but many communities ban or bury bare link posts, so check the sidebar rules before assuming the format is welcome.

The framework's compositor exports 1:1, 4:5, 9:16 and 16:9; for Reddit, default to 1:1 or 4:5 for any image post, since that is what the card view handles best.

Flair: many subreddits require a post flair before submission and route visibility by it; some flairs are auto-limited or excluded from the main feed for anything that smells like self promotion. Check the required flair list in the sidebar before posting, not after.

## Copy norms

The title is the whole pitch; write it as a real subreddit member would phrase a real post there, not as a headline. Body copy, if any, reads like a person explaining something, not a caption; skip the hook value CTA formula and skip the call to action entirely. No hashtags; Reddit has no hashtag convention, and using one is an immediate tell that the post came from a cross platform template.

Links: if the community allows self promotion at all, keep it to the 90/10 rule, roughly 90 percent of activity genuine participation with no product mention, 10 percent or less anything promotional. Even then, a link belongs in a comment reply to a relevant question more often than in the post itself.

## What gets punished

Crossposting the same content to many subreddits in a short window reads as spam to Reddit's velocity tracking, even with a unique title each time; roughly three related subs is a sane ceiling per idea. Vote manipulation, multiple accounts boosting the same post, asking for upvotes, off platform vote brigades, risks an account wide ban, not just a post removal. Anything that reads as an ad, including a post whose only purpose is a product mention, gets removed by moderators or AutoModerator on sight in most subreddits with self promotion rules. New accounts posting links before building any comment history get auto filtered by CQS and community rules before a human ever sees the post.

## Automation posture

Reddit's spam policy targets the behavior, not the tool: mass posting, repetitive promotional patterns, and scripted submission timing all count as spam whether a person or a bot triggers them. Third party schedulers can technically submit to Reddit through its API now, but the platform's own account quality systems weight recency, subreddit specific history and natural timing heavily; a post that lands from an obviously scheduled tool onto an account with no organic history in that subreddit is exactly the pattern CQS and moderators are built to catch.

Safe posture: the agent drafts the title and body exactly as they should read; a human being with real standing in that community reviews and sends it by hand, at a natural time, from an account that already participates there. This is the one surface in the pack where the send step stays manual by design, not by convenience.

## Cadence default

Per subreddit: no more than one self authored post every few days, and only where the 90/10 ratio still holds; comment participation can run daily.

Best windows vary enormously by subreddit and its dominant timezone; US evening hours, after dinner through pre bed, are a reasonable default starting point, then adjust to when that specific community is visibly most active.

## The stop test here

A scroll stopping Reddit post reads like it was written by someone who has actually read that subreddit for months: it uses the community's own shorthand, asks a real question or admits a real flaw, and would not out itself as marketing even to a skeptical regular.
