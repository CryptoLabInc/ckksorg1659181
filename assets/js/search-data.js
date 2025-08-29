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
          section: "News",},{id: "test-grafting-improving-performance-and-usability-of-homomorphic-encryption",
          title: 'Grafting: Improving Performance and Usability of Homomorphic Encryption',
          description: "TL;DR: Grafting is a new approach for managing a CKKS ciphertext modulus. With so-called sprouts, we dedicate a few machine words to scaling and use word-sized primes for the remaining ciphertext modulus improving performance. With universal sprouts, we can represent any bit size up to the word size using powers-of-two and introduce arbitrary scaling for RNS-CKKS easing parameter and circuit design.",
          section: "Test",handler: () => {
              window.location.href = "/test/2025-06-08-grafting/";
            },},{id: "test-bootstrapping-discrete-data-with-ckks",
          title: 'Bootstrapping Discrete Data with CKKS',
          description: "TL;DR: Recently, a new paradigm called discrete CKKS, which picks the best aspects of CKKS and other exact schemes has been suggested. To be more specific, it uses CKKS (a.k.a. the approximate homomorphic scheme) to compute over discrete data. In this article, we discuss the recent discrete bootstrapping in BKSS24 specifically designed for discrete CKKS.",
          section: "Test",handler: () => {
              window.location.href = "/test/2025-06-08-bootstrapping-discrete-data-with-ckks/";
            },},{id: "test-low-communication-threshold-fully-homomorphic-encryption",
          title: 'Low Communication Threshold Fully Homomorphic Encryption',
          description: "TL;DR: We propose a solution based on fully homomorphic encryption for privately delegating computation over data from multiple clients to a trusted server. Our construction ensures that every client&#39;s data remains private to other participants (server and other clients) even if all but one clients collude against the non-colluding client. It is the first to achieve low communication between all parties, as we also prove that prior low communication solutions to this problem are insecure.",
          section: "Test",handler: () => {
              window.location.href = "/test/2025-07-13-threshold/";
            },},{id: "test-neujeans-fast-private-cnn-inference-by-fusing-convolutions-and-bootstrapping-in-fhe",
          title: 'NeuJeans: Fast Private CNN Inference by Fusing Convolutions and Bootstrapping in FHE',
          description: "TL;DR: NeuJeans introduces a new “Coefficients-in-Slot” (CinS) encoding for CKKS. It rethinks how convolutions are laid out and fuses them with bootstrapping, cutting latency on big models like ResNet running over ImageNet.",
          section: "Test",handler: () => {
              window.location.href = "/test/2025-08-07-NueJeans/";
            },},{id: "test-convergent-evolution-why-secure-homomorphic-encryption-will-resemble-high-performance-gpu-computing",
          title: 'Convergent Evolution: Why Secure Homomorphic Encryption Will Resemble High-Performance GPU Computing',
          description: "TL;DR: TODO",
          section: "Test",handler: () => {
              window.location.href = "/test/2025-08-07-convergent-evolution/";
            },},{id: "test-ciphertext-ciphertext-matrix-multiplication-fast-for-large-matrices",
          title: 'Ciphertext-Ciphertext Matrix Multiplication: Fast for Large Matrices',
          description: "TL;DR: We propose fast ciphertext-ciphertext matrix multiplication (CC-MM) algorithms for large matrices. Our algorithms consist of plaintext matrix multiplications (PP-MM) and ciphertext matrix transpose algorithms (C-MT). We introduce and utilize new fast C-MT algorithms for large matrices. By leveraging high-performance BLAS libraries to accelerate PP-MM, we implement large-scale CC-MM with substantial performance improvements.",
          section: "Test",handler: () => {
              window.location.href = "/test/2025-08-10-ccmm/";
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
