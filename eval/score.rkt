#lang racket
(require json racket/sandbox)

(define args (current-command-line-arguments))
(define final-path (vector-ref args 0))
(define expected-path (and (> (vector-length args) 1) (vector-ref args 1)))
(define probe-path (and (> (vector-length args) 2) (vector-ref args 2)))

(define BUDGET-SECONDS 2)

; Detection-only I/O guard. Scored programs run in a base namespace where the
; obvious filesystem, process, network, and environment bindings are replaced by
; procedures that raise a marked error. This is not a real sandbox: a candidate
; that reaches the underlying primitives another way (e.g. `require`) can still
; perform I/O. See docs/adr/0009-scored-programs-no-io-guard.md.
(define IO-GUARD-MARK "io-guard:blocked:")

(define (guarded-names)
  '(open-input-file open-output-file open-input-bytes open-output-bytes
    call-with-input-file call-with-output-file
    with-input-from-file with-output-to-file
    delete-file rename-file-or-directory make-directory directory-list
    file->string file->bytes file->lines file->list file->value
    system subprocess shell-execute
    tcp-connect tcp-listen tcp-accept tcp-abandon-port
    udp-open-socket udp-send-to udp-receive!
    getenv putenv dynamic-require))

(define (install-io-guards! namespace)
  (eval `(define (io-guard-block! name)
           (raise (exn:fail (string-append ,IO-GUARD-MARK (symbol->string name))
                            (current-continuation-marks))))
         namespace)
  (for ([name (in-list (guarded-names))])
    (eval `(define ,name (lambda args (io-guard-block! ',name))) namespace)))

(define (strip-lang text)
  (define match (regexp-match #rx"^#lang[^\n]*\n?" text))
  (if match
      (substring text (string-length (car match)))
      text))

(define (read-all path)
  (call-with-input-string (strip-lang (file->string path))
    (lambda (in)
      (let loop ([acc '()])
        (define datum (read in))
        (if (eof-object? datum)
            (reverse acc)
            (loop (cons datum acc)))))))

(define (read-side path)
  (with-handlers ([exn:fail?
                   (lambda (e) (cons 'error (exn-message e)))])
    (cons 'ok (read-all path))))

(define (paren-mismatch? message)
  (and message
       (regexp-match? #rx"to close|unexpected `\\)|unexpected end of input" message)))

(define (bounded thunk)
  (with-handlers ([exn:fail?
                   (lambda (e)
                     (define message (exn-message e))
                     (cond
                       [(regexp-match? #rx"out of time" message) (cons 'unknown #f)]
                       [(regexp-match? #rx"io-guard:blocked:" message) (cons 'io-violation message)]
                       [else (cons 'error message)]))])
    (call-with-limits BUDGET-SECONDS 100000000000
      (lambda () (cons 'ok (thunk))))))

(define (eval-side datums probe)
  (define program
    (bounded
     (lambda ()
       (define namespace (make-base-namespace))
       (install-io-guards! namespace)
       (for-each (lambda (datum) (eval datum namespace)) datums)
       namespace)))
  (cond
    [(eq? (car program) 'ok)
     (define probe-result (and probe (bounded (lambda () (eval probe (cdr program))))))
     (hasheq 'evaluates #t
             'probe probe-result
             'ioViolation (and probe-result
                               (pair? probe-result)
                               (eq? (car probe-result) 'io-violation)))]
    [(eq? (car program) 'io-violation)
     (hasheq 'evaluates #f 'probe program 'ioViolation #t)]
    [else
     (hasheq 'evaluates #f 'probe (and probe program) 'ioViolation #f)]))

(define (semantic-verdict candidate expected)
  (cond
    [(or (not candidate) (not expected)) "unknown"]
    [(or (eq? (car candidate) 'unknown) (eq? (car expected) 'unknown)) "unknown"]
    [(equal? candidate expected) "equal"]
    [else "different"]))

(define (build-result)
  (define final-read (read-side final-path))
  (cond
    [(eq? (car final-read) 'error)
     (define message (cdr final-read))
     (hasheq 'parsed #f
             'parenMismatch (paren-mismatch? message)
             'evaluates #f
             'structural #f
             'semantic (if probe-path "unknown" (json-null))
             'ioViolation #f
             'error message)]
    [else
     (define final (cdr final-read))
     (define expected-read (and expected-path (read-side expected-path)))
     (define expected-ok (and expected-read (eq? (car expected-read) 'ok)))
     (define probe (and probe-path (car (read-all probe-path))))
     (define side (eval-side final probe))
     (define semantic
       (cond
         [(not probe-path) (json-null)]
         [else
          (define candidate-probe (hash-ref side 'probe))
          (define expected-probe
            (and expected-ok
                 (hash-ref (eval-side (cdr expected-read) probe) 'probe)))
          (semantic-verdict candidate-probe expected-probe)]))
     (hasheq 'parsed #t
             'parenMismatch #f
             'evaluates (hash-ref side 'evaluates)
             'structural (and expected-ok (equal? final (cdr expected-read)))
             'semantic semantic
             'ioViolation (hash-ref side 'ioViolation)
             'error #f)]))

(define result
  (with-handlers ([exn:fail?
                   (lambda (e)
                     (define message (exn-message e))
                     (hasheq 'parsed #f
                             'parenMismatch (paren-mismatch? message)
                             'evaluates #f
                             'structural #f
                             'semantic (if probe-path "unknown" (json-null))
                             'ioViolation #f
                             'error message))])
    (build-result)))

(write-json result)
(newline)
