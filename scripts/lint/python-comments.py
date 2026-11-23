import json
import sys
import tokenize

def comments(filename):
    with open(filename, "rb") as source:
        return [
            {"text": token.string, "line": token.start[0], "column": token.start[1] + 1}
            for token in tokenize.tokenize(source.readline)
            if token.type == tokenize.COMMENT
            and not (token.start == (1, 0) and token.string.startswith("#!"))
        ]

json.dump({filename: comments(filename) for filename in sys.argv[1:]}, sys.stdout)
