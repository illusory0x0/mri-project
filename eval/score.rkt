#lang racket
(require json racket/sandbox)

(define args (current-command-line-arguments))
(define final-path (vector-ref args 0))
(define expected-path (and (> (vector-length args) 1) (vector-ref args 1)))
(define probe-path (and (> (vector-length args) 2) (vector-ref args 2)))

(define BUDGET-SECONDS 2)

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
                     (if (regexp-match? #rx"out of time" message)
                         (cons 'unknown #f)
                         (cons 'error message)))])
    (call-with-limits BUDGET-SECONDS 100000000000
      (lambda () (cons 'ok (thunk))))))

(define (eval-side datums probe)
  (define program
    (bounded
     (lambda ()
       (define namespace (make-base-namespace))
       (for-each (lambda (datum) (eval datum namespace)) datums)
       namespace)))
  (if (eq? (car program) 'ok)
      (hasheq 'evaluates #t
              'probe (and probe (bounded (lambda () (eval probe (cdr program))))))
      (hasheq 'evaluates #f
              'probe (and probe program))))

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
                             'error message))])
    (build-result)))

(write-json result)
(newline)
