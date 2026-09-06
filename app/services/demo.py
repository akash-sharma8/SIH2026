from app.core.errors import PredictionError
from app.inference.adapter import InferenceAdapter


class DemoService:
    def get_demo_forecast(self, artifacts) -> dict:
        try:
            inference_adapter = InferenceAdapter(
                artifacts=artifacts
            )

            response = (
                inference_adapter.run_saved_demo()
            )

            if not isinstance(response, dict):
                raise PredictionError(
                    "Inference pipeline returned an "
                    "invalid demo response."
                )

            if response.get("success") is not True:
                raise PredictionError(
                    "Inference pipeline could not "
                    "generate the saved demo forecast."
                )

            predictions = response.get(
                "predictions"
            )

            if (
                not isinstance(predictions, list)
                or len(predictions) == 0
            ):
                raise PredictionError(
                    "Saved demo forecast contains "
                    "no predictions."
                )

            return response

        except PredictionError:
            raise

        except Exception as exc:
            raise PredictionError(
                "Failed to generate the saved "
                "RailETA demo forecast.",
                details={
                    "exception_type":
                        type(exc).__name__,
                },
            ) from exc 