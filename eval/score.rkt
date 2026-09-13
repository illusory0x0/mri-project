#lang racket
(require json racket/sandbox)

(define args (current-command-line-arguments))
(define final-path (vector-ref args 0))
(define expected-path (and (> (vector-length args) 1) (vector-ref args 1)))
(define probe-path (and (> (vector-length args) 2) (vector-ref args 2)))

(define BUDGET-SECONDS 2)

(define (read-all path)
  (call-with-input-file path
    (lambda (in)
      (let loop ([acc '()])
        (define datum (read in))
        (if (eof-object? datum)
            (reverse acc)
            (loop (cons datum acc)))))))

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

(define (eval-program datums)
  (define namespace (make-base-namespace))
  (for-each (lambda (datum) (eval datum namespace)) datums)
  namespace)

(define (evaluates? datums)
  (define outcome (bounded (lambda () (eval-program datums) #t)))
  (and (eq? (car outcome) 'ok) (cdr outcome)))

(define (probe-result path probe)
  (bounded
   (lambda ()
     (define datums (read-all path))
     (define namespace (eval-program datums))
     (eval probe namespace))))

(define (semantic-verdict probe)
  (define candidate (probe-result final-path probe))
  (define expected (probe-result expected-path probe))
  (cond
    [(or (eq? (car candidate) 'unknown) (eq? (car expected) 'unknown))
     "unknown"]
    [(equal? candidate expected) "equal"]
    [else "different"]))

(define result
  (with-handlers ([exn:fail?
                   (lambda (e)
                     (define message (exn-message e))
                     (hasheq 'parsed #f
                             'parenMismatch (paren-mismatch? message)
                             'evaluates #f
                             'structural #f
                             'semantic (if probe-path "different" (json-null))
                             'error message))])
    (define final (read-all final-path))
    (define expected (and expected-path (read-all expected-path)))
    (define structural (and expected-path (equal? final expected)))
    (define probe (and probe-path (call-with-input-file probe-path read)))
    (hasheq 'parsed #t
            'parenMismatch #f
            'evaluates (evaluates? final)
            'structural structural
            'semantic (if probe-path (semantic-verdict probe) (json-null))
            'error #f)))

(write-json result)
(newline)
