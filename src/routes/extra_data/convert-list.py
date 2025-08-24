import json

def main():
    data = {}
    with open('quoteList.txt', mode='r', encoding='utf-8') as f:
        for line in f:
            command, description = line.strip().split(None, 1)
            data[command.split('.', 1)[0]] = description.strip()
    out_file = open('quoteList-json.json', 'w')
    json.dump(data, out_file, indent=4, sort_keys=False)
    out_file.close()

main()