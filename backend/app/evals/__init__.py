"""LLM evaluation harness for Sanskrit generation, diagnosis and translation.

Scores model output with the *same* Vidyut analyzer the product grades with
(``app.grading.analyzer``), so eval results map directly onto shipped behaviour:
a model that fails the gate here fails it in production too.
"""
