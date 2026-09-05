-- 0037_fix_email_newlines_all.sql
-- 0035 tried to repair literal backslash-n line breaks but its LIKE guard
-- (`body like '%\n%'`) treated backslash as the LIKE escape, so it matched
-- the letter "n" instead of the sequence and left most templates untouched.
-- Repair ALL templates unconditionally: any remaining literal "\n" / "\r\n"
-- becomes a real newline. Idempotent — real newlines are unaffected.
-- The render layer (fillVars) also normalises these now, so this is belt-and
-- suspenders and mainly keeps the admin editor/preview clean.

begin;

update public.email_automations
   set body = replace(replace(body, E'\\r\\n', E'\n'), E'\\n', E'\n'),
       subject = replace(subject, E'\\n', E'\n'),
       updated_at = now()
 where body like ('%' || E'\\n' || '%') escape '!'
    or body like ('%' || E'\\r' || '%') escape '!';

commit;
