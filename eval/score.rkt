#lang racket
(require json)

(define args (current-command-line-arguments))
(define final-path (vector-ref args 0))
(define expected-path (and (> (vector-length args) 1) (vector-ref args 1)))

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

(define (evaluates? datums)
  (with-handlers ([exn:fail? (lambda (e) #f)])
    (define namespace (make-base-namespace))
    (for-each (lambda (datum) (eval datum namespace)) datums)
    #t))

(define result
  (with-handlers ([exn:fail?
                   (lambda (e)
                     (define message (exn-message e))
                     (hasheq 'parsed #f
                             'parenMismatch (paren-mismatch? message)
                             'matches #f
                             'evaluates #f
                             'error message))])
    (define final (read-all final-path))
    (define matches
      (if expected-path
          (equal? final (read-all expected-path))
          #f))
    (hasheq 'parsed #t
            'parenMismatch #f
            'matches matches
            'evaluates (evaluates? final)
            'error #f)))

(write-json result)
(newline)
