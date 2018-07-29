from django import template

register = template.Library()

@register.filter(name='index')
def index(Dict,i):
    try:
        return Dict[int(i)]
    except Exception:
        return None