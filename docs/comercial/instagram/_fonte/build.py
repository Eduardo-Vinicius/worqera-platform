import os
import lib, posts_67, posts_new
for k, v in lib.posts.items():
    open(os.path.join(lib.OUT, f'{k}.html'), 'w').write(v)
print({k: v.count('class="sl"') for k, v in lib.posts.items()})
