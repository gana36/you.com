import requests

url = "https://api.ydc-index.io/v1/search"

querystring = {"query":"apple stock prize"}

headers = {"X-API-Key": "ydc-sk-856778837a1bd143-1xnEQtu7Zmc5N5knEzKHBo0iqkwVu0CT-11f0597d<__>1SMtvLETU8N2v5f4hadNCUmt"}

response = requests.get(url, headers=headers, params=querystring)

print(response.json())