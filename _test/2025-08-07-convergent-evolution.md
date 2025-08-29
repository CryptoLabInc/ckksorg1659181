---
layout: post
title: >
  Convergent Evolution: Why Secure Homomorphic Encryption Will Resemble High-Performance GPU Computing
date: 2025-08-07 00:00:00-0400
description: >
  TL;DR: TODO
author: Sunchul Jung
tags:
categories:
related_posts: false
pretty_table: true
---

- Written by [Sunchul Jung](https://www.linkedin.com/in/sunchul-jung-78331082/) (CryptoLab)

*TL;DR: TODO*

---

Fully Homomorphic Encryption (FHE) and high-performance GPU computing have evolved under fundamentally different pressures—**security** and **performance**—yet I argue that their **programming models** are converging toward a **branch-free, massively parallel paradigm**.  

This convergence arises from FHE’s **Turing Barrier**: while FHE is *theoretically Turing-complete*, supporting secret-dependent control flow securely is **practically infeasible** without incurring combinatorial overheads. Meanwhile, GPUs evolved under different constraints—avoiding **warp divergence**—but reached similar design instincts: **uniform, parallel-first kernels**.

However, FHE introduces **strictly stronger constraints** than GPUs:
- Every kernel must be **data-oblivious**.
- Memory access patterns must remain uniform.
- The **Host $\leftrightarrow$ Device(Trusted-Host $\leftrightarrow$ Secure-Kernel-Executor in the FHE context) offloading surface** must be formally defined.

Using Quicksort and Approximate Nearest Neighbor (ANN) search as case studies, I show why pruning-based optimizations—highly effective in plaintext—become **anti-secure** under encryption. Recent works, including **HEIR** [1], **SLOTHE** [2], and **PBS-based inference** [3], confirm these fundamental constraints, demonstrating incremental improvements within fixed sandboxes but falling short of general solutions.  

I conclude that the future of practical FHE lies in **hybrid architectures** where trusted clients orchestrate control flow and untrusted servers execute **branchless, parallel secure kernels**. GPU programming paradigms provide valuable blueprints, but advancing secure computation demands an **FHE-native programming model**.

---

## Table of Contents

1. [Introduction](#1-introduction)  
2. [Background: Fundamental Constraints](#2-background-fundamental-constraints)  
   2.1. [The FHE Security Model and the Turing Barrier](#21-the-fhe-security-model-and-the-turing-barrier)  
   2.2. [How FHE Compilers Handle Control Flow](#22-how-fhe-compilers-handle-control-flow)  
   2.3. [Compilation Resource Explosion Warning](#23-compilation-resource-explosion-warning)  
   2.4. [Programmable Bootstrapping and Its Limits](#24-programmable-bootstrapping-and-its-limits)  
   2.5. [Memory Access and ORAM Lower Bounds](#25-memory-access-and-oram-lower-bounds)  
3. [Convergent Evolution: FHE and GPUs](#3-convergent-evolution-fhe-and-gpus)  
4. [A Practical Architecture: The Hybrid Model](#4-a-practical-architecture-the-hybrid-model)  
5. [Case Studies: The Parallel-First Imperative](#5-case-studies-the-parallel-first-imperative)  
6. [Comparative Analysis of Recent Research](#6-comparative-analysis-of-recent-research)  
7. [Implications for FHE Systems](#7-implications-for-fhe-systems)  
8. [Future Work: Toward FHE-Native Programming Models](#8-future-work-toward-fhe-native-programming-models)  
9. [Conclusion](#9-conclusion)  
10. [References](#10-references)

---

## 1. Introduction

Fully Homomorphic Encryption (FHE) enables arbitrary computation on encrypted data without exposing plaintexts [Gentry 2009]. Meanwhile, GPUs have revolutionized computing by enabling massive parallelism, powering deep learning and high-performance computing [Owens et al. 2008].

Despite different origins, these two paradigms now face **structurally similar challenges**:
- For FHE, secret-dependent branching introduces **side-channel leakage** risks.
- For GPUs, divergent branching causes **performance degradation**.
- In both domains, uniform, parallel computation emerges as the natural solution.

This post explores:
1. Why FHE and GPU models are converging.
2. Why pruning-based optimizations fail under encryption.
3. **Why problem redefinition—not translation—is key for FHE**.
4. Why we must explicitly define the **host-device offloading surface**.
5. How recent research advances both reinforce and clarify these limits.

---

## 2. Background: Fundamental Constraints

### 2.1 The FHE Security Model and the Turing Barrier

An FHE scheme evaluates $f(\mathrm{Enc}(x)) \rightarrow \mathrm{Enc}(f(x))$ without revealing $x$. However, secure execution forbids revealing **control flow** or **memory access patterns** derived from secret data.  

Dynamic branches and loops are problematic:
- `if-else` decisions → leak branch outcomes.
- Secret-dependent loops → leak iteration counts.

Thus, FHE programs must adopt **data-oblivious execution** [Goldreich & Ostrovsky 1996]:
- Evaluate both paths of all branches.
- Fix loop bounds to public constants.
- Make memory accesses uniform.

This reality is sometimes summarized as the **Turing Barrier**: FHE remains Turing-complete in theory, but secure evaluation under unrestricted control flow is **practically infeasible**.

---

### 2.2 How FHE Compilers Handle Control Flow

Most developers assume FHE behaves like a traditional runtime: write an `if` statement, and only the chosen branch executes. **But this would leak secrets**—if the server observes which path was taken, it learns private data.

#### Example: Encrypted Conditional

```c
if (encrypted(cond))
    subroutine_a();
else
    subroutine_b();
```

In plaintext:
- Only one subroutine executes.
- Execution path leaks no sensitive info.

In FHE:
- If the server sees *which branch executed*, the condition is leaked.
- Therefore, **both branches must always execute**.

#### How the Compiler Handles It

1. **Evaluate both subroutines**  
   - `Enc(result_a) = subroutine_a(Enc(x))`  
   - `Enc(result_b) = subroutine_b(Enc(x))`

2. **Select final result arithmetically**  
   Instead of branching, the compiler produces an arithmetic `select`:
   $$\mathrm{Enc}(r) = \mathrm{Enc}(\text{cond}) \cdot \mathrm{Enc}(r_a) + (1 - \mathrm{Enc}(\text{cond})) \cdot \mathrm{Enc}(r_b)$$

3. **Loops become bounded**  
   - Secret-dependent `while` loops can't terminate early.
   - The compiler executes a **fixed upper bound** of iterations, masking out unused results.

<div class="row mt-3">
    <div class="col-sm-7 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2509_Sunchul/fig1.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 1: FHE Conditional Execution
</div>

**Key takeaway:** Under FHE, writing `if (encrypted(cond)) ...` in source code **does not** imply conditional execution; the compiler **always executes both paths** and combines results securely.

---

### 2.3 Compilation Resource Explosion Warning

It is important to note that the combinatorial blow-up caused by encrypted control flow affects not only **runtime performance** but also the **compilation process itself**.

For every secret-dependent branch, the FHE-aware compiler must **materialize all possible subroutines** into encrypted circuits. In the worst case, $N$ nested conditions yield:

- **Circuit size:** $O(2^N)$  
- **Compilation memory usage:** exponential in branch count  
- **Circuit optimization passes:** may become intractable

Recent experiments with LLVM-based FHE IRs such as **HEIR** confirm that, beyond a certain branching complexity, compilers frequently hit **out-of-memory (OOM) errors** — *before execution even begins*.

This demonstrates that **directly translating** branch-heavy business logic into FHE **without algorithmic adaptation** is infeasible. **Problem redefinition is not an optimization choice** — it is a **requirement** for tractable FHE compilation.

<div class="row mt-3">
    <div class="col-sm-7 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2509_Sunchul/fig2.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 2. Branch Explosion at Compile Time
</div>

---

### 2.4 Programmable Bootstrapping and Its Limits

TFHE’s **Programmable Bootstrapping (PBS)** [Chillotti et al. 2020] enables efficient LUT-based evaluation of small non-linear functions. Recent works like **SLOTHE** [2] further optimize PBS calls, reducing cost by compressing LUT evaluation.

However, PBS does **not** eliminate the combinatorial blow-up of complex business logic:
- SLOTHE’s optimizations are **pattern-limited**, applicable to fixed, low-dimensional functions.
- Decision-tree inference using PBS [3] works only for **small, fixed-depth trees**; adaptive branching remains insecure.

PBS provides a valuable tool but **not a universal escape hatch**.

---

### 2.5 Memory Access and ORAM Lower Bounds

When computations require secret-dependent memory access, **Oblivious RAM (ORAM)** must be used to hide patterns [Goldreich & Ostrovsky 1996]. However:
- ORAM has a **provable lower bound**: $\Omega(\log n)$ per access.
- Even optimal constructions like **OptORAMa (2022)** cannot break this limit.
- For large-scale workloads, ORAM costs dominate if memory access depends on secrets.

**Implication:** Secret-driven memory access cannot be made “cheap” under FHE. Algorithms must be **redesigned** to avoid adaptive memory patterns.

---

## 3. Convergent Evolution: FHE and GPUs

FHE and GPU computing converge structurally, despite orthogonal motivations.

| Aspect | GPU Offloading (CUDA/ROCm/SYCL) | FHE Hybrid Model (Proposed) |
|-----|------------------------------|-----------------------------|
| **Primary Goal** | *Maximize throughput* | *Preserve confidentiality* |
| **Execution Style** | *SIMT, branch-minimized* | *Branchless, data-oblivious* |
| **Offloading Model** | *Implicit, library-driven* | *Explicit, security-driven* |
| **Boundary Definition** | *Kernel APIs, runtime libraries* | *Formally defined security surface* |
| **Workload Assumption** | *Dense, GPU-friendly ops* | *Arbitrary* **→** *refactoring needed* |
| **Memory Model** | *Observable, hierarchical* | *Must be oblivious* |
| **Programming Model** | *Emergent, pragmatic* | *Intentional, security-first* |

<br />

Unlike GPUs, FHE cannot rely on emergent patterns or serendipitous alignment. We must **explicitly define host-device offloading** and **design kernels intentionally**.

---

## 4. A Practical Architecture: The Hybrid Model

**Terminology Note**: I borrow the **host-device** terminology from GPU programming models (e.g., CUDA, ROCm, SYCL) for intuitive consistency. In the FHE context:  
- **Host** → **Trusted-Host**: Orchestrates application logic, manages secret-dependent control flow, and launches secure kernels.  
- **Device** → **Secure-Kernel-Executor**: Executes branchless, data-oblivious kernels on encrypted inputs in an untrusted environment.

### 4.1 Note on GPU Programming Models

Although I borrow GPU programming terminology, **GPU programming models themselves are not fully standardized**:
- **Multiple ecosystems**: CUDA, ROCm, SYCL, OpenCL coexist with different runtime semantics.
- **Offloading is API-driven**: AI workloads are often expressed via **linear algebra libraries** like cuBLAS, cuDNN, or TensorRT, not formal control-flow abstractions.
- **Lack of rigorous semantics**: There is no mathematically formal definition of when, how, and why computations transition between **host** and **device**.

This reality implies an **even greater challenge for FHE**: we must **explicitly define** the offloading boundary between the **Trusted-Host** and the **Secure-Kernel-Executor**, because FHE imposes **far stricter constraints** than GPUs.


<div class="row mt-3">
    <div class="col-sm-7 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2509_Sunchul/fig3.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 3. Offloading Model Comparison
</div>


---

## 5. Case Studies: The Parallel-First Imperative

Developers often assume FHE’s **Turing completeness** implies pruning-based optimizations can be directly ported. However, pruning—adaptive traversal, early stopping, selective evaluation—is **anti-secure**.

### 5.1 Sorting

- **Quicksort (Anti-FHE):** Adaptive pivots and partitions leak structural information.
- **Sorting Networks (FHE-Friendly):** Fixed compare-swap sequences (e.g., Bitonic Sort) → uniform, oblivious, parallelizable.

### 5.2 Approximate Nearest Neighbor (ANN)

- **HNSW (Anti-FHE):** Adaptive graph traversal leaks query-specific paths.
- **Brute-Force Scan (FHE-Compatible):** Evaluate distances for **all** vectors uniformly.

| Algorithm | Plain Complexity | FHE-Compatible Complexity | Overhead Source |
|-----------|-----------------|---------------------------|------------------|
| **IVF-FLAT** | *$$O(k\cdot d +\frac{n_{\text{probe}}}{k}\cdot N\cdot d)$$* | *$O(k\cdot d + N\cdot d)$* | *Removing adaptive probing* |
| **HNSW** | *$$O(\log N\cdot d)$$* | *$$O(N\cdot d)$$* | *Eliminating path pruning* |

<br />

<div class="row mt-3">
    <div class="col-sm-7 mt-3 mt-md-0 mx-auto d-block">
        {% include figure.liquid loading="eager" path="assets/img/blog/2509_Sunchul/fig4.png" class="img-fluid rounded z-depth-1" zoomable=true %}
    </div>
</div>
<div class="caption">
    Figure 4. Pruning vs. Parallelism
</div>

**Key Insight:** In FHE, **brute force is the baseline**, not the fallback. Performance gains come from **parallelizing fixed workloads**, not pruning.

---

## 6. Comparative Analysis of Recent Research

| **Work** | **Core Idea / Contribution** | **Scope / Applicability** | **Limitations & Implications** |
|-----------|-----------------------------|--------------------------|-------------------------------|
| **HEIR (2025) [1]** | *Unified IR for FHE compilation* | *Expressive across CKKS, BFV, TFHE backends* | *Enforces strict loop unrolling; secret-dependent branching disallowed → Confirms Turing Barrier* |
| **SLOTHE (2025) [2]** | *PBS circuit compression for TFHE* | *Efficient for fixed LUT(Look-Up Table)-based non-linearities* | *Limited to local patterns; cannot eliminate control-flow explosion* |
| **PBS Tree Inference (2023) [3]** | *TFHE-based inference for small decision trees* | *Works for fixed-depth, small models* | *Not scalable to adaptive branching; dynamic paths remain insecure* |
| **OptORAMa (2022) [4]** | *Near-optimal oblivious memory* | *Provably tight asymptotics* | *$\Omega(\log n)$ overhead unavoidable; secure random access is inherently expensive* |

<br />

**Takeaway:** Recent progress expands FHE’s reach but validates the central thesis: **general-purpose, efficient, secure FHE requires problem redefinition, not direct translation.**

---

## 7. Implications for FHE Systems

- **FHE-aware compilers** must act as **policy enforcers** not a magician:
    - Convert branches into predicated arithmetic.
    - Enforce loop unrolling to constant bounds.
    - Optimize SIMD-style ciphertext packing.

- **Hardware accelerators** for FHE will **increasingly resemble GPUs**:
    - High-throughput execution cores.
    - On-die NTT engines.
    - High-bandwidth memory for ciphertext batching.

- **Design implication**: The **parallel-first paradigm** isn’t just optimal — it’s necessary for secure performance.

---

## 8. Future Work: Toward FHE-Native Programming Models

- **Short-Term Goals**:
    - Expand libraries of FHE-friendly kernels (sorting, ANN, linear algebra).
    - Selectively integrate PBS for local non-linearities.

- **Long-Term Challenges**:
    - Define **formal offloading surfaces** for hybrid architectures.
    - Develop **FHE-native primitives** for graphs, ML inference, and ANN.
    - Reimagine compilers as **policy enforcers**, not universal translators.

---

## 9. Conclusion

FHE’s Turing completeness remains intact theoretically, but **secure practical computation demands problem redefinition**:  
- Branching-based pruning accelerates plaintext workloads.  
- Under encryption, pruning leaks secrets or introduces prohibitive costs.

The future of FHE requires:
- **Hybrid architectures** with explicit host-device boundaries.
- **Branchless, parallel-first problem formulations**.
- Leveraging GPU-inspired execution models while respecting FHE’s stricter constraints.

<br />
<h2 style="text-align:center; font-size:2em;">Stop translating. Start redefining.</h2>
<br />

---

## 10. References

[1] Riazi et al., “HEIR: A Common Intermediate Representation for Homomorphic Encryption”, IACR ePrint 2025.  
[2] Khedr et al., “SLOTHE: Programmable Bootstrapping Optimizations for TFHE”, USENIX Security 2025.  
[3] Chou et al., “Efficient Tree Inference with TFHE Bootstrapping”, PETS 2023.  
[4] Goldreich & Ostrovsky, “Software Protection and Simulation on Oblivious RAMs”, JACM 1996.
