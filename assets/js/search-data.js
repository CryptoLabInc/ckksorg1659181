// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-home",
    title: "home",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-software",
          title: "software",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/software/";
          },
        },{id: "post-radixckks-a-general-framework-for-integer-computation-over-ckks",
        
          title: "RadixCKKS: A General Framework for Integer Computation over CKKS",
        
        description: "TL;DR: To handle large integers in FHE, a common approach is to decompose an integer into several small pieces, called digits, and perform computations based on them. One such approach is the radix-based approach, which decomposes a large integer into digits in base $B$ and carries out arithmetic on those digits via polynomial operations. However, after arithmetic operations, the resulting representation is no longer unique, which makes it difficult to directly perform non-arithmetic operations such as comparison or bitwise operations. The process of restoring such a disturbed digit representation back to its unique form is commonly called digit carry, and this step inherently requires non-arithmetic processing. In this post, we introduce a two-step homomorphic digit carry algorithm over CKKS. Our algorithm restores the digit representation to its unique form using $O(\log k)$ bootstrappings.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/radix-ckks/";
          
        },
      },{id: "post-verifiable-computation-for-ckks",
        
          title: "Verifiable Computation for CKKS",
        
        description: "TL;DR: Homomorphic Encryption (HE) enables computing over encrypted data but, by itself, provides no guarantees that the computation was honestly executed. One can build &quot;Verifiable HE&quot; (vHE) using SNARKs, but efficiently combining HE and SNARKs in practice is a major challenge. This work introduces a blueprint for building verifiable HE schemes and its efficient instantiation for CKKS. Our first step is to introduce a &quot;proof-friendly&quot; version of CKKS, which is more amenable to proof systems, while being only slightly slower than typical RNS CKKS implementations. We then show how the problem of proving correctness of computations for such proof-friendly HE schemes can be reduced to just two sets of arithmetic relations (containing equalities and inequalities). We show that if these are satisfied, it implies the correct execution of the HE evaluation. We design Polynomial Interactive Oracle Proofs (PIOPs) for efficiently proving these relations, and we show how they can be instantiated using standard proof components. Our final construction demonstrates the feasibility of building SNARKs for proving computation of full-fledged HE schemes, opening the path for building practical verifiable HE schemes.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/verifiable-ckks/";
          
        },
      },{id: "post-orion-a-fully-homomorphic-encryption-framework-for-deep-learning",
        
          title: "Orion: A Fully Homomorphic Encryption Framework for Deep Learning",
        
        description: "TL;DR: Orion is a framework that compiles PyTorch neural network models into efficient CKKS FHE programs for encrypted inference. Orion automatically handles low-level FHE details such as data packing, bootstrap placement, and precision management. Orion is open-sourced at: https://github.com/baahl-nyu/orion.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/orion/";
          
        },
      },{id: "post-dphe-protecting-server-privacy-in-ckks-based-protocols",
        
          title: "DPHE: Protecting Server Privacy in CKKS-based Protocols",
        
        description: "TL;DR: We investigate methods for protecting server privacy in CKKS-based protocols. Unlike exact homomorphic encryption schemes, formally defining security notions for the server is challenging in CKKS-based protocols due to the approximate nature of CKKS. We address this by introducing a new security notion called Differentially Private Homomorphic Encryption, which is motivated by differential privacy. Based on this notion, we construct a general compiler that transforms CKKS-based protocols into DPHE protocols. We also present the first zero-knowledge argument of knowledge for CKKS ciphertexts to protect server privacy against malicious clients.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/DPHE/";
          
        },
      },{id: "post-homomorphic-encryption-for-data-science",
        
          title: "Homomorphic Encryption for Data Science",
        
        description: "TL;DR: FHE has advanced significantly since its introduction fifteen years ago, yet it remains challenging to use efficiently. We examine methods addressing three of the major challenges faced by cryptographers and data scientists face when using FHE: data packing; polynomial approximations and data traversal.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/HE4DS/";
          
        },
      },{id: "post-a-novel-asymmetric-bsgs-polynomial-evaluation-algorithm-under-homomorphic-encryption",
        
          title: "A Novel Asymmetric BSGS Polynomial Evaluation Algorithm under Homomorphic Encryption",
        
        description: "TL;DR: We introduce a new polynomial evaluation algorithm under homomorphic encryption, namely the Asymmetric BSGS Algorithm. It is a generalization and specialization of the original Baby-Step Giant-Step algorithm in the leveled FHE computation model. Leveraging the observation that there is a difference in multiplicative depth between the baby-step set and the giant-step set, this algorithm significantly reduces the number of modulus and key switches required for dense polynomial evaluation from $O(\sqrt{d})$ to $O(d^{1/t})$, by adjusting the set decomposition method and relaxing the control of noise growth and ciphertext size in some calculations. Here, $d$ is the polynomial degree and $t$ is a small constant which, according to our experiments, is recommended to be chosen as $4$.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/asymmetric-BSGS-algorithm/";
          
        },
      },{id: "post-leveraging-discrete-ckks-to-bootstrap-in-high-precision",
        
          title: "Leveraging Discrete CKKS to Bootstrap in High Precision",
        
        description: "TL;DR: We introduce a new high-precision CKKS bootstrapping method. It leverages a novel Integer Cleaning strategy inspired by the Discrete CKKS technique and is implemented using the Grafting technique. We highlight its main building blocks and discuss its efficiency.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/high_prec_bootstrap/";
          
        },
      },{id: "post-convergent-evolution-why-secure-homomorphic-encryption-will-resemble-high-performance-gpu-computing",
        
          title: "Convergent Evolution: Why Secure Homomorphic Encryption Will Resemble High-Performance GPU Computing",
        
        description: "TL;DR: Fully Homomorphic Encryption (FHE) programming hits a fundamental Turing Barrier where secure computation forbids the dynamic branching that makes conventional software work, forcing it into a parallel-first paradigm surprisingly similar to the high-performance GPU model. This means the future of FHE isn&#39;t a magic compiler, but a hybrid architecture where a trusted client orchestrates complex logic, while an untrusted server executes simple, branchless secure kernels on encrypted data across a well-defined offloading boundary. Ultimately, developers must stop trying to translate old optimization habits and start redefining problems from the ground up, because in the world of FHE, performance isn&#39;t about pruning—it&#39;s about parallelism.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/convergent-evolution/";
          
        },
      },{id: "post-neujeans-fast-private-cnn-inference-by-fusing-convolutions-and-bootstrapping-in-fhe",
        
          title: "NeuJeans: Fast Private CNN Inference by Fusing Convolutions and Bootstrapping in FHE",
        
        description: "TL;DR: NeuJeans introduces a new “Coefficients-in-Slot” (CinS) encoding for CKKS. It rethinks how convolutions are laid out and fuses them with bootstrapping, cutting latency on big models like ResNet running over ImageNet.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/NueJeans/";
          
        },
      },{id: "post-ciphertext-ciphertext-matrix-multiplication-fast-for-large-matrices",
        
          title: "Ciphertext-Ciphertext Matrix Multiplication: Fast for Large Matrices",
        
        description: "TL;DR: We propose fast ciphertext-ciphertext matrix multiplication (CC-MM) algorithms for large matrices. Our algorithms consist of plaintext matrix multiplications (PP-MM) and ciphertext matrix transpose algorithms (C-MT). We introduce and utilize new fast C-MT algorithms for large matrices. By leveraging high-performance BLAS libraries to accelerate PP-MM, we implement large-scale CC-MM with substantial performance improvements.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/ccmm/";
          
        },
      },{id: "post-low-communication-threshold-fully-homomorphic-encryption",
        
          title: "Low Communication Threshold Fully Homomorphic Encryption",
        
        description: "TL;DR: We propose a solution based on fully homomorphic encryption for privately delegating computation over data from multiple clients to a trusted server. Our construction ensures that every client&#39;s data remains private to other participants (server and other clients) even if all but one clients collude against the non-colluding client. It is the first to achieve low communication between all parties, as we also prove that prior low communication solutions to this problem are insecure.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/threshold/";
          
        },
      },{id: "post-bootstrapping-discrete-data-with-ckks",
        
          title: "Bootstrapping Discrete Data with CKKS",
        
        description: "TL;DR: Recently, a new paradigm called discrete CKKS, which picks the best aspects of CKKS and other exact schemes has been suggested. To be more specific, it uses CKKS (a.k.a. the approximate homomorphic scheme) to compute over discrete data. In this article, we discuss the recent discrete bootstrapping in BKSS24 specifically designed for discrete CKKS.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/bootstrapping-discrete-data-with-ckks/";
          
        },
      },{id: "post-grafting-improving-performance-and-usability-of-homomorphic-encryption",
        
          title: "Grafting: Improving Performance and Usability of Homomorphic Encryption",
        
        description: "TL;DR: Grafting is a new approach for managing a CKKS ciphertext modulus. With so-called sprouts, we dedicate a few machine words to scaling and use word-sized primes for the remaining ciphertext modulus improving performance. With universal sprouts, we can represent any bit size up to the word size using powers-of-two and introduce arbitrary scaling for RNS-CKKS easing parameter and circuit design.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/grafting/";
          
        },
      },{id: "news-ckks-org-is-resleeved",
          title: 'CKKS.org is resleeved!',
          description: "",
          section: "News",},{id: "news-hyeongmin-choe-joins-as-new-co-editor",
          title: 'Hyeongmin Choe joins as new co-editor!',
          description: "",
          section: "News",},{id: "news-we-ve-enabled-giscus-on-ckks-org-you-can-now-leave-comments-and-reactions-using-your-github-account-hopefully-this-makes-it-easier-to-share-thoughts-ask-questions-and-start-conversations",
          title: 'We’ve enabled Giscus on ckks.org! You can now leave comments and reactions using...',
          description: "",
          section: "News",},{id: "news-keewoo-lee-is-phasing-out-his-role-as-a-co-editor-may-2025-jan-2026-we-are-deeply-grateful-for-his-dedication-from-the-very-beginning",
          title: 'Keewoo Lee is phasing out his role as a co-editor (May 2025 –...',
          description: "",
          section: "News",},{id: "news-guillaume-hanrot-joins-as-new-co-editor",
          title: 'Guillaume Hanrot joins as new co-editor!',
          description: "",
          section: "News",},{id: "test-modern-construction-of-moduli-chain-in-heaan2",
          title: 'Modern Construction of Moduli Chain in HEaaN2',
          description: "TL;DR: Every CKKS computation is built upon a sequence of moduli that predetermines the rescaling amount after each multiplication. A new CKKS library, HEaaN2, generalizes the construction of this parameter with a carefully designed scheme and API set. In this article, we break down the traditional construction of the moduli chain to derive the new one.",
          section: "Test",handler: () => {
              window.location.href = "/test/2026-04-25-heaan2-moduli-chain/";
            },},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%79%6F%75@%65%78%61%6D%70%6C%65.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/company/ckks-org", "_blank");
        },
      },{
        id: 'social-rss',
        title: 'RSS Feed',
        section: 'Socials',
        handler: () => {
          window.open("/feed.xml", "_blank");
        },
      },];
