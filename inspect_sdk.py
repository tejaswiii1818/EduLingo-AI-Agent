import inspect
from ibm_watsonx_ai.foundation_models import ModelInference

print("ModelInference.generate_text signature:")
print(inspect.signature(ModelInference.generate_text))
print("\n\nModelInference.generate_text docstring:")
print(inspect.getdoc(ModelInference.generate_text))
