# The framework: what automates, what does not, and why

The decision framework underneath the fleet. Evidence-based as of mid-2026; re-verify the platform-behavior claims yearly, they move.

## The one thing to internalize

**The bottleneck on full marketing automation is not AI output quality. It is that the platforms you publish into detect and punish zero-human pipelines.** Search engines run pattern-level detection on publication velocity and cross-page similarity, so a full-auto pipeline gets caught even when each page passes a quality bar. Mailbox providers score senders and templated mail decays reply rates. Social platforms label, throttle and ban automated behavior on the surfaces where it is unwelcome. Hybrid pipelines with a human gate survive everywhere full-auto burns.

Therefore: **one-touch, not zero-touch.** AI produces everything, a human approves at one daily choke point, machines execute and measure after. Roughly 80 to 85 percent of the labour automates; the rest is structurally human (strategy, relationships, accountability), not a tech gap that closes next model release.

## Per-lane verdicts

FULL-AUTO: runs on cron, human sees reports. HYBRID: AI produces, human gates, machine executes. HUMAN: AI assists at the edges.

| Lane | Verdict | Note |
|---|---|---|
| Keyword/SERP/competitor tracking | FULL-AUTO | reports only |
| Technical audits | FULL-AUTO | monthly cadence is enough |
| AI-answer presence tracking | FULL-AUTO | trends only; single snapshots are noise |
| Blog/FAQ/glossary drafting | HYBRID | the editorial gate is the survival requirement |
| Social drafting + scheduling | HYBRID | one daily batch review |
| Social engagement/replies | HUMAN sends | drafts automate fine; the send is the relationship |
| Community surfaces | HUMAN sends | automation is unwelcome and detected |
| Visual production | HYBRID | generate + composite automates; approval gates |
| Analytics readouts | FULL-AUTO | the most automatable lane there is |
| Interpreting analytics into strategy | HUMAN | agents flag, humans decide |
| Strategy, positioning, offers | HUMAN | exactly what the gate exists to protect |

## The architecture that survives

Long-running agents fail predictably: context fills, attention degrades, unscoped agents one-shot everything and die, later runs hallucinate completion. The fix is structural, and it is this repo:

- **Many small single-purpose agents**, each doing one unit of work per run
- **State in files, not conversation memory**; every run reads state at start, writes at end
- **Machine-checkable completion**; a run ends in a named outcome or a written blocker
- **A human gate at the one place it pays for itself**
- **Verification agents** (reconciliation, monthly-audit) watching the others

## What kills it

1. Removing the gate to chase "fully automated". The gate is what keeps accounts alive.
2. One big agent instead of many small ones.
3. State in conversations.
4. Unthrottled velocity. The guardrails are not decoration.
5. No audit cadence. Agents drift; the monthly audit catches it before a platform does.
