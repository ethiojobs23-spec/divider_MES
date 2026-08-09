import os
import re

directory = 'src/views'

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    original = content
    
    # CSS: width: 350px; -> width: 100%; max-width: 350px;
    # Only match if it doesn't already have max-width nearby, but regex is simpler:
    content = re.sub(r'(\s+)width:\s*([3-9]\d{2,})px;', r'\1width: 100%;\n\1max-width: \2px;', content)
    
    # CSS: min-width: 420px; -> width: 100%; max-width: 420px;
    content = re.sub(r'(\s+)min-width:\s*([2-9]\d{2,})px;', r'\1width: 100%;\n\1max-width: \2px;', content)
    
    # Tailwind: w-[400px] -> w-full max-w-[400px]
    content = re.sub(r'(class="[^"]*)\bw-\[([3-9]\d{2,})px\]([^"]*")', r'\1w-full max-w-[\2px]\3', content)
    
    # Tailwind: w-96 -> w-full max-w-md
    content = re.sub(r'(class="[^"]*)\bw-96([^"]*")', r'\1w-full max-w-sm\2', content)
    
    # Tailwind: w-80 -> w-full max-w-xs
    content = re.sub(r'(class="[^"]*)\bw-80([^"]*")', r'\1w-full max-w-xs\2', content)
    
    # Fix tables that cause overflow by adding block overflow-x-auto wrapper
    # This is harder to do safely with regex. But let's check for min-w-[600px]
    content = re.sub(r'class="(.*?)min-w-\[([5-9]\d{2,})px\](.*?)"', r'class="\1w-full\3" style="min-width: \2px;"', content)
    
    if content != original:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Updated {filepath}")

for root, dirs, files in os.walk(directory):
    for file in files:
        if file.endswith('.vue'):
            process_file(os.path.join(root, file))
