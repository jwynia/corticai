# LLM Memory Pruning Strategies: Research Survey

**Status**: Research Documentation
**Domain**: Memory Management, LLM Agents, Knowledge Pruning
**Created**: 2025-10-13 (from Perplexity research)
**Enhanced**: 2025-10-28
**Related**: [[../architecture/semantic-processing/attention-gravity-problem]], [[../architecture/semantic-processing/design-rationale]]

---

## CorticAI Context

This research survey explores existing approaches to memory pruning and forgetting in LLM systems. CorticAI adapts these strategies with key differences:

**Key Adaptations**:
- **Time → Lifecycle**: Existing tools use temporal decay; CorticAI uses lifecycle states (semantic relevance)
- **Conversational → Knowledge**: Existing tools optimize for chat context; CorticAI optimizes for codebase/project knowledge
- **Deletion → Compression**: Existing tools delete old memories; CorticAI compresses with projections (non-lossy)
- **Recency → Attention**: Existing tools boost recent; CorticAI manages attention gravity explicitly

**See Also**:
- [[../architecture/semantic-processing/design-rationale]] - How CorticAI differs from these approaches
- [[../architecture/semantic-processing/attention-gravity-problem]] - The specific problem CorticAI solves
- [[../architecture/semantic-processing/semantic-pipeline-stages]] - Where CorticAI applies semantic operations

---

## Original Research Question

> There are lots of papers, libraries and tools around storing memories for LLMs, but are there any strategies or tools aimed at memory pruning to remove memory of things that should fade in prominence?

## Research Summary

<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

Comprehensive information about memory pruning strategies for LLMs:

## Memory Pruning Strategies for LLM Agent Systems

While extensive research exists on storing and retrieving memories for LLM-based agents, there is indeed a growing body of work on **memory pruning, forgetting mechanisms, and removing information that should fade in prominence**. These strategies draw inspiration from human cognitive psychology and address the practical challenges of maintaining efficient, relevant long-term memory systems.

### Temporal Decay and Forgetting Curve Models

One of the most prominent approaches is based on the **Ebbinghaus Forgetting Curve** theory. The MemoryBank system implements a memory updating mechanism inspired by this psychological principle, where:[^1_1][^1_2][^1_3]

- Memory retention decreases exponentially over time following the formula \$ R = e^{-t/S} \$, where R is retention, t is elapsed time, and S is memory strength[^1_1]
- Memory strength (S) is modeled as a discrete value, initialized at 1 when first mentioned
- When a memory is recalled, S increases by 1 and t resets to 0, lowering the probability of forgetting
- Memories that are infrequently recalled and distant in time naturally decay and can be functionally forgotten

This approach enables AI systems to maintain anthropomorphic memory behavior, prioritizing frequently accessed and recently reinforced information while allowing less important memories to fade.[^1_4][^1_5]

### Recency-Based Memory Management

Several systems implement **temporal awareness** and recency scoring for memory prioritization:[^1_6][^1_7]

- The Generative Agents framework uses recency as one of three key factors (alongside importance and relevance) for memory retrieval
- Recency scores typically decrease exponentially with a decay factor (e.g., 0.995 per hour)[^1_6]
- More recent memories receive higher retrieval priority unless offset by high importance or relevance scores


### Strategic Memory Deletion Approaches

Recent research on memory management for LLM agents has identified three primary deletion strategies:[^1_8]

**Periodical-based Deletion**: Uses fixed thresholds based on retrieval frequency during specific time periods. Memories retrieved below a certain threshold within a time window are removed. This achieves substantial memory reduction with minimal performance degradation.[^1_8]

**History-based Deletion**: Removes memories based on utility evaluations. When paired with a reliable evaluator, this approach can actually improve agent performance by retaining only high-utility experiences while discarding low-value or error-prone memories.[^1_8]

**Combined Deletion**: Merges periodical and history-based approaches, offering a balance between performance maintenance and memory size reduction.[^1_8]

### Relevance-Based Pruning Strategies

More sophisticated systems employ **adaptive memory pruning** based on multiple relevance dimensions:[^1_9]

- **Embedding-based relevance scoring**: Each memory receives a score reflecting its semantic alignment with recent queries or tasks
- **Temporal decay models**: Gradually reduce the significance of memories unless reinforced through access
- **Hierarchical summarization**: Condense multiple similar memory entries into single representative summaries, maintaining information richness while reducing token count
- **Reinforcement-driven pruning**: Monitor which memories contribute to task success and retain only those that enhance reasoning accuracy[^1_9]


### Context Window Management and Eviction Policies

Systems like **MemGPT** (now Letta) implement OS-inspired memory management:[^1_10][^1_11][^1_12]

- **Queue eviction policies**: When context approaches token limits (e.g., 70% capacity), the system receives "memory pressure" warnings
- At 100% capacity, the queue manager flushes messages, generates recursive summaries, and moves evicted content to external storage (recall storage)
- Content is not deleted but moved out of immediate context, retrievable via function calls when needed[^1_10]

This approach maintains unlimited memory capacity within fixed context windows through intelligent memory hierarchy management.

### Selective Forgetting and Machine Unlearning

For scenarios requiring removal of specific information, **machine unlearning** techniques enable selective forgetting:[^1_13][^1_14][^1_15][^1_16]

- **SeUL (Selective Unlearning)**: Targets specific sequence spans rather than entire instances, minimizing impact on model capabilities
- **Fine-grained forgetting**: Removes sensitive spans while preserving general knowledge
- **Validation-based removal**: Marks information as invalid without deletion, using temporal metadata to deprioritize outdated facts[^1_17]


### Forgetting as Design Philosophy

A key insight from recent research emphasizes that **forgetting should be viewed as a feature, not a bug**:[^1_17]

- Perfect memory creates cognitive overload and prevents adaptation to changing contexts
- Without forgetting, AI systems struggle to distinguish between important and trivial information
- Users experience "honeymoon phases" with memory systems that eventually become frustrating when AI cannot adapt to evolving preferences[^1_17]


### Practical Tools and Frameworks

Several production-ready tools implement these strategies:

**Mem0**: Provides centralized memory control with capabilities for "effortless storage, updating, and deletion of memories"[^1_18][^1_19][^1_20][^1_21]

**LangChain/LangGraph**: Offers memory management abstractions with support for different retention strategies across memory types[^1_22][^1_23][^1_24]

**Letta** (formerly MemGPT): Implements self-directed memory editing where agents autonomously decide when to move items between contexts[^1_11][^1_25][^1_26]

**Zep**: Supports fact invalidation based on temporal awareness without complete deletion[^1_17]

### Current Limitations and Future Directions

Despite progress, significant challenges remain:[^1_27][^1_17][^1_8]

- Determining optimal importance and relevance metrics remains contextual and difficult to quantify algorithmically
- Most systems lack nuanced understanding of changing user preferences over time
- Current approaches often apply uniform forgetting rules rather than context-sensitive strategies
- The balance between remembering for continuity and forgetting for adaptation requires ongoing research

The field is moving toward **self-optimizing AI memory** with automated forgetting and compression, along with more sophisticated attention-based and context-sensitive recall mechanisms that understand not just what to remember, but when and how much to forget.[^1_28]
<span style="display:none">[^1_100][^1_101][^1_102][^1_103][^1_104][^1_105][^1_29][^1_30][^1_31][^1_32][^1_33][^1_34][^1_35][^1_36][^1_37][^1_38][^1_39][^1_40][^1_41][^1_42][^1_43][^1_44][^1_45][^1_46][^1_47][^1_48][^1_49][^1_50][^1_51][^1_52][^1_53][^1_54][^1_55][^1_56][^1_57][^1_58][^1_59][^1_60][^1_61][^1_62][^1_63][^1_64][^1_65][^1_66][^1_67][^1_68][^1_69][^1_70][^1_71][^1_72][^1_73][^1_74][^1_75][^1_76][^1_77][^1_78][^1_79][^1_80][^1_81][^1_82][^1_83][^1_84][^1_85][^1_86][^1_87][^1_88][^1_89][^1_90][^1_91][^1_92][^1_93][^1_94][^1_95][^1_96][^1_97][^1_98][^1_99]</span>

<div align="center">⁂</div>

[^1_1]: https://arxiv.org/pdf/2305.10250.pdf

[^1_2]: https://arxiv.org/abs/2305.10250

[^1_3]: https://github.com/zhongwanjun/MemoryBank-SiliconFriend

[^1_4]: https://www.artiba.org/blog/adaptive-forgetting-in-large-language-models-enhancing-ai-flexibility

[^1_5]: https://shelf.io/blog/forget-llm-memory-why-llms-need-adaptive-forgetting/

[^1_6]: https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1591618/full

[^1_7]: https://arxiv.org/html/2410.13553v1

[^1_8]: https://arxiv.org/html/2505.16067v2

[^1_9]: https://www.reddit.com/r/AI_associates/comments/1nul2bx/how_can_adaptive_memory_pruning_keep_ai_agents/

[^1_10]: https://arxiv.org/pdf/2310.08560.pdf

[^1_11]: https://docs.letta.com/guides/agents/memory

[^1_12]: https://www.linkedin.com/pulse/memgpt-towards-llms-operating-systems-alan-kelleher-qvv7c

[^1_13]: https://arxiv.org/html/2402.05813v2

[^1_14]: https://www.turing.ac.uk/sites/default/files/2025-07/arc_selective_forgetting_in_llms.pdf

[^1_15]: https://arxiv.org/abs/2402.05813

[^1_16]: https://research.ibm.com/blog/llm-unlearning

[^1_17]: https://ai.plainenglish.io/forgetting-in-ai-agent-memory-systems-7049181798c4

[^1_18]: https://microsoft.github.io/autogen/0.2/docs/ecosystem/mem0/

[^1_19]: https://arxiv.org/html/2504.19413v1

[^1_20]: https://mem0.ai

[^1_21]: https://github.com/mem0ai/mem0

[^1_22]: https://www.pingcap.com/article/langchain-memory-implementation-a-comprehensive-guide/

[^1_23]: https://langchain-ai.github.io/langgraph/concepts/memory/

[^1_24]: https://docs.langchain.com/oss/python/concepts/memory

[^1_25]: https://composio.dev/blog/podcast-with-charles-from-letta

[^1_26]: https://www.letta.com

[^1_27]: https://www.okoone.com/spark/technology-innovation/fixing-the-way-llms-handle-memory/

[^1_28]: https://www.reddit.com/r/AI_Agents/comments/1j7trqh/memory_management_for_agents/

[^1_29]: https://arxiv.org/html/2407.11681v1

[^1_30]: https://arxiv.org/abs/2407.11681

[^1_31]: https://www.philschmid.de/memory-in-agents

[^1_32]: https://www.superannotate.com/blog/llm-pruning-distillation-minitron-approach

[^1_33]: https://arxiv.org/html/2504.15965v1

[^1_34]: https://mem0.ai/blog/memory-in-agents-what-why-and-how

[^1_35]: https://www.sapien.io/blog/llm-distillation-and-pruning

[^1_36]: https://arxiv.org/html/2504.15965v2

[^1_37]: https://openreview.net/forum?id=zFR5aWGaUs\&noteId=W7A5SWSL5D

[^1_38]: https://www.reddit.com/r/MachineLearning/comments/1mj3n3v/d_do_you_think_llm_memory_will_ever_be_solved/

[^1_39]: https://www.reddit.com/r/LocalLLaMA/comments/1gsb3av/memoripy_bringing_memory_to_ai_with_shortterm/

[^1_40]: https://www.reddit.com/r/LocalLLaMA/comments/1gp6dxb/why_is_llm_pruning_not_as_generally_available_as/

[^1_41]: https://yuweisunn.github.io/blog-1-06-24.html

[^1_42]: https://developer.nvidia.com/blog/pruning-and-distilling-llms-using-nvidia-tensorrt-model-optimizer/

[^1_43]: https://arxiv.org/html/2404.13501v1

[^1_44]: https://arxiv.org/html/2508.05239v1

[^1_45]: https://teachlikeachampion.org/blog/an-annotated-forgetting-curve/

[^1_46]: https://www.emergentmind.com/topics/persistent-memory-for-llm-agents

[^1_47]: https://aclanthology.org/2025.coling-main.626.pdf

[^1_48]: https://www.youtube.com/watch?v=UpAq9EZpL5A

[^1_49]: https://www.emergentmind.com/topics/memory-mechanisms-in-llm-based-agents

[^1_50]: https://en.wikipedia.org/wiki/Forgetting_curve

[^1_51]: https://arxiv.org/pdf/2502.16090.pdf

[^1_52]: https://openreview.net/forum?id=PxoFut3dWW

[^1_53]: https://aclanthology.org/2025.findings-acl.972.pdf

[^1_54]: https://www.nature.com/articles/s41598-025-92586-5

[^1_55]: https://ai.plainenglish.io/temporal-semantics-for-ai-memory-agents-1f61e454d049

[^1_56]: https://www.reddit.com/r/MachineLearning/comments/13i8uis/d_at_some_point_does_it_make_more_sense_for_an/

[^1_57]: https://research.ibm.com/blog/memory-augmented-LLMs

[^1_58]: https://blog.capitaltg.com/overcoming-memory-limitations-in-generative-ai-managing-context-windows-effectively/

[^1_59]: https://aws.amazon.com/blogs/machine-learning/building-smarter-ai-agents-agentcore-long-term-memory-deep-dive/

[^1_60]: https://www.reddit.com/r/Rag/comments/1n9680y/breaking_the_context_window_building_infinite/

[^1_61]: https://strandsagents.com/latest/documentation/docs/examples/python/memory_agent/

[^1_62]: https://www.reddit.com/r/MyBoyfriendIsAI/comments/1mzhffm/context_rot_why_memory_isnt_good_enough_read_the/

[^1_63]: https://arxiv.org/html/2507.05257v2

[^1_64]: https://relevanceai.com/docs/knowledge/introduction

[^1_65]: https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents

[^1_66]: https://www.reddit.com/r/AI_Agents/comments/1msy97w/how_do_you_handle_longterm_memory_personalization/

[^1_67]: https://jameshoward.us/2024/11/26/context-degradation-syndrome-when-large-language-models-lose-the-plot

[^1_68]: https://dl.acm.org/doi/10.1145/3748302

[^1_69]: https://diamantai.substack.com/p/memory-optimization-strategies-in

[^1_70]: https://research.trychroma.com/context-rot

[^1_71]: https://agentkit.inngest.com/concepts/memory

[^1_72]: https://deeplizard.com/learn/video/Bcuj2fTH4_4

[^1_73]: https://www.reinforcementlearningpath.com/experience-replay/

[^1_74]: https://www.neuralnet.ai/a-brief-overview-of-rank-based-prioritized-experience-replay/

[^1_75]: https://proceedings.mlr.press/v119/fedus20a/fedus20a.pdf

[^1_76]: https://arxiv.org/html/2404.00573v1

[^1_77]: https://openreview.net/forum?id=8SPSIfR2e0

[^1_78]: https://arxiv.org/abs/1906.08387

[^1_79]: https://www.sciencedirect.com/science/article/pii/S0893608025007592

[^1_80]: https://pmc.ncbi.nlm.nih.gov/articles/PMC10333526/

[^1_81]: https://www.letta.com/blog/agent-memory

[^1_82]: https://www.lesswrong.com/posts/mFAvspg4sXkrfZ7FA/deep-forgetting-and-unlearning-for-safely-scoped-llms

[^1_83]: https://www.reddit.com/r/reinforcementlearning/comments/114fqu4/developing_an_understanding_of_experience_replay/

[^1_84]: https://debmalyabiswas.substack.com/p/long-term-memory-for-ai-agents

[^1_85]: https://milvus.io/ai-quick-reference/how-does-langchain-handle-longterm-memory-versus-shortterm-memory

[^1_86]: https://www.linkedin.com/pulse/langchain-memory-management-rutam-bhagat-lfrgf

[^1_87]: https://blog.langchain.com/langmem-sdk-launch/

[^1_88]: https://www.linkedin.com/pulse/day-4-agent-memory-systems-short-term-long-term-episodic-marques-rp3ge

[^1_89]: https://web.stanford.edu/class/cs224g/lectures/Mem0_CS224.pdf

[^1_90]: https://langchain-ai.github.io/langmem/concepts/conceptual_guide/

[^1_91]: https://www.ai21.com/glossary/agent-memory/

[^1_92]: https://blog.langchain.com/launching-long-term-memory-support-in-langgraph/

[^1_93]: https://pmc.ncbi.nlm.nih.gov/articles/PMC8961807/

[^1_94]: https://arxiv.org/html/2409.00872v1

[^1_95]: https://www.reddit.com/r/AI_Agents/comments/1glzob6/tutorial_on_building_agent_with_memory_using_letta/

[^1_96]: https://towardsai.net/p/l/explore-generative-ai-agents-that-can-remember-reflect-and-plan-actions

[^1_97]: https://news.ycombinator.com/item?id=37901902

[^1_98]: https://www.letta.com/blog/benchmarking-ai-agent-memory

[^1_99]: https://lab.chatcampaign.io/ai-articles/bringing-ai-to-life-how-generative-agents-mimic-human-behavior-with-memory-and-reflection

[^1_100]: https://www.getfocal.co/post/unlocking-the-potential-of-language-models-with-memgpt-a-deep-dive

[^1_101]: https://reflectedintelligence.com/2025/04/29/memory-and-reflection-foundations-for-autonomous-ai-agents/

[^1_102]: https://joanfihu.com/2024/07/17/memgpt-enhancing-llm-capabilities-through-operating-system-principles/

[^1_103]: https://github.com/letta-ai/letta

[^1_104]: https://huggingface.co/blog/Kseniase/reflection

[^1_105]: https://arxiv.org/pdf/2502.12110.pdf

