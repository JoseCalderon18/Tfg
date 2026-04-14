from pathlib import Path
p = Path('entrypoint.sh')
p.write_text('#!/bin/sh\nset -e\necho "[entrypoint] Starting application..."\nexec "$@"\n', encoding='utf-8', newline='\n')
print(repr(p.read_bytes()))
