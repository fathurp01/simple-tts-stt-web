import re
import ast
import operator as op


class ValidationResult:
    def __init__(self, valid: bool, result: int = None, errors: list = None):
        self.valid = valid
        self.result = result
        self.errors = errors or []

    def to_dict(self) -> dict:
        return {"valid": self.valid, "result": self.result, "errors": self.errors}


class ArithmeticValidator:
    """
    Validates an arithmetic equation against the Arithmetic Challenge rules:

    1. Between 7 and 8 unique numbers from digits 2-9 (no repeats, no 0, no 1).
    2. Must use ALL four operators: +, -, *, / (each at least once).
    3. Division constraints:
       - Divisor cannot be 1.
       - Dividend and divisor must not be equal.
       - Division must result in a whole number (no fractions).
    4. Final result must be a whole integer.
    """

    OPERATORS = {"+", "-", "*", "/"}

    def validate(self, equation: str) -> ValidationResult:
        errors = []
        equation = equation.strip()

        if not equation:
            return ValidationResult(False, errors=["Equation is empty"])

        # ----------------------------------------------------------------
        # 1. Tokenize
        # ----------------------------------------------------------------
        try:
            tokens = self._tokenize(equation)
        except ValueError as e:
            return ValidationResult(False, errors=[str(e)])

        # ----------------------------------------------------------------
        # 2. Validate numbers
        # ----------------------------------------------------------------
        numbers = [t for t in tokens if isinstance(t, int)]
        unique = set(numbers)

        if len(unique) not in (7, 8):
            errors.append(
                f"Must have exactly 7 to 8 unique numbers (found {len(unique)})"
            )
        if any(n < 2 or n > 9 for n in unique):
            errors.append("All numbers must be digits between 2 and 9 (1 is not allowed)")
        if len(numbers) != len(unique):
            errors.append("Duplicate numbers are not allowed (all numbers must be unique)")

        # ----------------------------------------------------------------
        # 3. Validate operators present
        # ----------------------------------------------------------------
        ops_found = {t for t in tokens if t in self.OPERATORS}
        missing = self.OPERATORS - ops_found
        if missing:
            errors.append(f"Missing operator(s): {', '.join(sorted(missing))}")

        if errors:
            return ValidationResult(False, errors=errors)

        # ----------------------------------------------------------------
        # 4. Evaluate with division-rule enforcement
        # ----------------------------------------------------------------
        try:
            result = self._evaluate(tokens)
            if not isinstance(result, int):
                errors.append(
                    f"Final result must be a whole integer (got {result})"
                )
            if errors:
                return ValidationResult(False, result=result, errors=errors)
            return ValidationResult(True, result=result)
        except ValueError as e:
            return ValidationResult(False, errors=[str(e)])

    # ------------------------------------------------------------------
    # Tokenizer
    # ------------------------------------------------------------------
    def _tokenize(self, equation: str) -> list:
        s = equation.replace(" ", "")
        tokens = []
        i = 0
        while i < len(s):
            ch = s[i]
            if ch.isdigit():
                j = i
                while j < len(s) and s[j].isdigit():
                    j += 1
                tokens.append(int(s[i:j]))
                i = j
            elif ch in "+-*/()":
                tokens.append(ch)
                i += 1
            else:
                raise ValueError(f"Unexpected character '{ch}' at position {i}")
        return tokens

    # ------------------------------------------------------------------
    # Expression evaluator (PEMDAS via Shunting-Yard → Postfix)
    # ------------------------------------------------------------------
    def _evaluate(self, tokens: list) -> int:
        postfix = self._to_postfix(tokens)
        return self._eval_postfix(postfix)

    def _to_postfix(self, tokens: list) -> list:
        prec = {"+": 1, "-": 1, "*": 2, "/": 2}
        output = []
        stack = []
        for t in tokens:
            if isinstance(t, int):
                output.append(t)
            elif t in prec:
                while (
                    stack
                    and stack[-1] != "("
                    and prec.get(stack[-1], 0) >= prec[t]
                ):
                    output.append(stack.pop())
                stack.append(t)
            elif t == "(":
                stack.append(t)
            elif t == ")":
                while stack and stack[-1] != "(":
                    output.append(stack.pop())
                if stack and stack[-1] == "(":
                    stack.pop()
        while stack:
            output.append(stack.pop())
        return output

    def _eval_postfix(self, postfix: list) -> int:
        stack = []
        for t in postfix:
            if isinstance(t, int):
                stack.append(t)
            else:
                b = stack.pop()
                a = stack.pop()
                if t == "+":
                    stack.append(a + b)
                elif t == "-":
                    stack.append(a - b)
                elif t == "*":
                    stack.append(a * b)
                elif t == "/":
                    self._check_division(a, b)
                    stack.append(a // b)
        result = stack.pop()
        if isinstance(result, float) and result.is_integer():
            return int(result)
        return result

    # ------------------------------------------------------------------
    # Division rule checks
    # ------------------------------------------------------------------
    @staticmethod
    def _check_division(dividend: int, divisor: int):
        if divisor == 1:
            raise ValueError("Division by 1 is not allowed")
        if dividend == divisor:
            raise ValueError(
                f"Cannot divide {dividend} by itself"
            )
        if dividend % divisor != 0:
            raise ValueError(
                f"Division {dividend}/{divisor} must yield a whole number"
            )


# ------------------------------------------------------------------
# Standalone helper
# ------------------------------------------------------------------
def validate_equation(equation: str) -> dict:
    return ArithmeticValidator().validate(equation).to_dict()
