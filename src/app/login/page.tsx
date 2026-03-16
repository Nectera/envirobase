"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getTranslation, Language, TranslationKey } from "@/lib/translations";
import Logo from "@/components/Logo";

// Inline base64 logo for instant rendering on the login page (no network request)
const INLINE_LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAD0AAABQCAYAAACqCH1tAAAd/klEQVR42tV8e2AU1fX/59x7Zx95B5IAAcIrvMJDXoIoQiK+sQrqrvVbLdVWqNVWa39V22qTaP1abW3tw1aoVltbq7tFq7YISk1AClVBBAERBRGQEAiSkNfuztx7fn/M7mY3L4Fa++3FibM7szP3zDn33HM+n3OH8AmNOSSJggYAAwqNh+um7ml5PXCweVuZNnxRo1NHDrWDjQ1mAwYDYLBBxz4TmOOf2YDJAAyA4P5hkXrHjkPxRiCACMzu9brtZ+IIuee7/zguA0PDYVigQWrGLtWbwKFQQBIFtYAH++rf/Pp7H6/9n+c++N70FvWRsJ1WtLYeA0sNULyjlOhket843umkEJzoTPJsEJAmLKcJ3fl6Kd93Pp87jlHKBRmC2lujGD5g2gjqXrtMYQRFkMK6vbm5vPbDpd9ptLaeW9f8DlpajwHI1EoAkkgmbmIovTPEHZ3ShM+8JYWONwMYr5UpynwL3lLdCUxEDEBv3r3q1lcO3nvfjrbVaGqLOJZQQolMAbAUSJhbV8309l1ax6jjGhS3hNRrfpqPQEPDL/ycpQr+oLoI7AqTsXrn0m9uOPbYDz5s3Kp9gpAplDLQAAn3ETIDTJ+KRjhh60Sfsq7jj54ItmNTnjWQJvQ7Z7VKFbi2tlxyOcu39q5ctct+ZeZHzdsdn8pUBA0DnXALif/S7aezU0npv+hymkjcNOl8uGOQd2rmRAy6020IhgGQozMzPaLIe8rbuQUF76VqWlRUrHbWbX3yu+/x8pl7Pn7bzlDZFnNCWHEcBnsiGvj3NgaDmUGsYJsYD80aTwN9439IRE3C9dIhSUR6z0fbvrGP11bvObLB9otsi9n8a+IRdbP19D0lx3Xqb/8VscGAYTJeT44qcKZvGjN0Tpi5UojKykoRCAQNM/fbfCT0g92NbxiPyFbCUMrsx0njOaGNP1mvhMS86u4Lcjf3c+/37e2Te00vG9HEI7KnYUzhvIVEZIexnVTx5+okEeyarUu/cZBfz2Y2jiShDNmdOpfo2ok/8E+0iLSxzGn/7+6eCQ/PqZaR4mKICIYIUdPoDM0Zaw1R0xeW9B/xdigUkkEKamJmAtD3yY2L39vX/kYO2Esgm7o4o5MTuYcmOgnR4biPb0hxPDYQaUKLuEcUJNDqtMVK+o70jPd84S/TRwcWhEJ/ksFgUAOAIiL+585lN7d4D+bpNnYkQX22YUSv8dXxTnhxDQswa9PmNPGoAVM9Y9WVz08afmGwsmaWCpQHdOI8xcwZy9++d0FjWx0LsgTgpI21T8fnUqf5jLscTg9KKOVAym/JiX9nAeRAGNcxMgmAhYmaZuP1+NSYrPMxPufcu8r6n383ETkpAZcrdFtT27hmp35stL0NHpUpUufFT8+cUzsuYFgkp/ru9ZoSWAju0CkTmAmCBEAEQ8YYjgJshN+TI4blzBCFPG3Laf2u/GpG39z1nSLMZFMb9z/XtyG6l4gkdw4EOoeIJ23AyesADkfhDiAiNonA3bgHuSPL6ngcJuUaAoCBNgZECrnZWTJT9IPfGYIBOWO2jMib86uSggm/I6JIDdeocpTrzgIDgIKyrzLeFpAtDQD57x27EoX+4RBOxlHHxCzL8mYR2BDIICX2pjRty/ieAIEhBOCRWfCJokifrJxVBf7SzSWZc5fn5ue87nAEibijgiqcnnqiDja9w1pFwSnynpxmRbfadQNJBYINdiTnyeFUmjPrzbFFF97na1fr3jm6ymfl9M/wseEIieSN/QAAX/KT3+93v/O7+wAcIqrrnPsDAUNEureeKpsjn26c362ODYj9kMLQzqYVzgdtm+buaK45fXy/s8KjR1Tc7/VmbzuZ64ZCAVlYWEaHD4/jYDCoiYL6eH6nGNpFG6jD/XdO745H8z2nhK4LMtSitTEqJzNf+WQuwM7HbKKZLZHmIaFQaEdhoJBqq2qPL+6tAqpQxZ+k0R6F1jDU2yhM+Bc6Qd26EI+AY2zNypZFmQNVPo83GSh+brB/7KMTRp1fQ0RtJ2U61UA1qk/a8lQ01hyFnyGYOxxoSnqYhIE6xdHcJZdOnZYsaIpodtqpKHeEzOUxDUP9M35x6sgFTxCJDxJ3CXFABhBiIjL4DJvKzRgwrMneCUoT+aTAmUSEzhHTonMy8lRp3myUZJ76w4lDLn6QiOoBoLISoqoqRB0O57PHkmjNrt/wK/t/AZ/wg6CTs2Tn2LtrxkRpkROxBWZtbI6IEUWTMUic/rdpxV+4LyMn41UAqKmpVLW1MNXV1Qb/4aZisRgTpeGYPcTA6ccMMRQ7IFjQ8CJKLY7fm6FG++dFRmfN/X+nDL3oIdtch1AoIAOBkCEiB/9HmnI9DncfAvYQHroZtoBhLyAJUW50BvcZofqZ2ZsuHPzNKymX3gVAoVBIuJkN4f9SUwwGn2Cn3DTOgZHaxHTMDMubosZYF94/vTT4QyI6umHDEmvq1EXOyU4pzCxSTSt8HL8JxM8LpHwXDoeRSCfTNX3CkCuDoGBYGoMWMbnoAjFCXVI5vnTWXcAVYGZBRDawuCeBqKq2VgK1qK6odnqAmf6t414ZYzroGKKeaRMiwFggEYE2rLXFcqTvnKPTcr9838ABY+5bsmSRtWjREqenDldWVort47ZTXPsOAGQoL9gwtNFxeyMYMGzW4wH0cyIOR5wIOY4DBw604ypNKgkFBSeeBquUvwDgU4p9WVkEoNEisVGnJTEArdj2M17f8Ah85I+Ho9yBJqYkKJINSGfBEe3G8rEoFmccHu65+OyZE8/eUllTqXrSWigUksFtQUa1my4xc8GGXdvOeevIB6MPt34c2NywS+xu/AhRx4YNg5i2MTCnsDQ/v4+KxqJgR8OwOwh1PL3unOsL4UJZ2hgIIhAJeCyJo01HTb6/cOcdUy+7Y+aISctCzDJIpFVqRpOAaroLO4kFjHCMIeYiM/VQWcaC8yaPr9iyYcMSa9q0xXYPTAmCwaBWIBz7uHXIT98K3XDVs3d9eXv7/j4NdhMONNdDJ5KVRK4hCbuO7AcOORqGO6Ijok7+kAEhOkHkJpmzgwxAMS4dNHnMviP1fQFgW20tJeCidHyEOAXAcdNB19F5EKGP9YT+51qj7M9fPaHstLd6EjgQh5S90sLuI/vP+/32l7951l9vnfGeU593pLEeYEdDEEN4hGACMcNQB7ouhI9IkDTcO5yaAAYpFWxLgY8d0+aISMwYsJ0+ppNgvou/pgpMcOkbAYmIabFHFJ5qjfVfWjV+1Bkv1dTUqGnTKuzO2g2GwyIcDGpmHvLw+mfvXvT3n1/990ObEIk0AxBaKkswlOQkRMAgpKah3AFlUFcXmm59KZxYKvzAAEGAQTCahG2n5xeqZ/RRAkwgYWDbrXZxUZlVal18f9mg2dUhDnRJ0lOJv427t9924/KffOfJva/mHm05bMjysBIeYZilMSadjv4XmZEuQ7EbX2yM7uq9O7KJVBKYQJDQ2ugMX39rlGfeW6eNuPSuUCggAwiZ1E7EpynDzFm/ee3Zb9287qGqV+s2A5bUluWVJq7BJAmfhmCiV3CZmdME4wQCTwRjNNhxIJRyrxo3a05B4IgEOj9jYWC65Q8IDG3YKI9PDMuY9cGZRVefQ0St2wJlnIo7xSkhw8x5D7761N8f2PFs1asHNjjK8rCAlDY4yV13R/rxJ2yumQowKQhpQQlh2DjGRFvgdQgD+vSDVBImPlMmTTzBEQpACtlJ01onRU1NFxmALZu5JHMWTsm/7GbKoYYarlGpZh0IhWTQHb85X1t2/4pww7rpDe2HbOnNsDQbEJEL5VHvAVBvjC+DIIkANlo7toClRLGvCOf0Ha/zc7PlC3UbgJgDKQiaOsoQkty3AHzSStc0u4YXh6PjTB8IMdY6118sh6rTnxg+aPzzIU4H20KhkAwHg5o/5txrnv7By08eWjOjob3eUcprdTZJl8vm3uLO7r0KE5SB1nabA6+Qw3OK6foRF259as6tf5w+aOKRv+15k3cd3s9aie6hEANIkvBaXgaA8o7Y28SHcxqfZJRgMYhnNZwxZuGNIc6QAQRMWsDhajj7umX3rPxz4z+mt8RaHSV9ymgVH7v6pMNEclN71jrKwuOT0/pOwmgUrPnqpEt+XNJ34Ihb1jx0+7IPXykCeVj4fMRsu3UC1MmjGYMsjx/F+QWqU+wdZ4FIgI1rjjaazZDcmWpS/kX3EFFLTU2looogJ8LJuMC5t/zlpyuXHXltRkusxRFkKc3sBgXopgO9+mV3riYAgj1sizYNw2pCfimdWTj+9S9OuOCpGSXjHrvr748+vGzjr6/YcngnlGUxmMgxTncOG8zM8FiSj7UfG+3tvxIAastdDE4YNh2dIgeGbZNjFak+Ztzq0sGnPljJlaIiHmIyM20ft52YOftXq/+84um9a2ccbWtypPEqdmumQOATI+9ZAbAgICCMo2200dDsQeprYy5r+MkZN97yu8/dMaPMX7zxhhcf3PHTD5ZfsaV+pxaWhzUEaWI3mKKufoEAwDE02j/A+IvzG1w8sYqTqWWKWbGRjAIa3zq3ZNFC5pupKuVCSzcuVeFg2H5y/co7fr3v5dMOxOpiwpvhYQcgmVIoQ5+gXY5DjQRIZhiCcUwMmf5sOTtrxOFrxl7w6y9MufBhIqoLbXj5+i+s+fGvXtz3GgBo4fFLY2yX3u3tFsYxGRm5stCT+wqAWCJK7HDs8U4YFrpv7iDRz1/2WEafjA9raytlNbnwTk1NjVo8bbH92rubFz6yZ+WtWw9stqXX4zHGwAg6qUBDQkCjXUPYYlbhJPHtkvnPrVrwi0lXTZ1XSUR1/1vzuwd/vOuZX72wZ5VtLDYgIVlrCO4ALXvmMh0u8OViyqCyLUTklBVuow5agpNEIjNrmRMtaZk6OPgjMKi2NpkZiYqKCs3Mg5Zsf/He2oNvGcufIZlFvHLABZINASwojSzvwoMwYLmpktF2u1PgzZXXDq5476FZN15377wb5lMmHWDmkupVj63++XvP3/T6gc1aeLMsY1g4wgEL3eMUKOJ8nzAAtCNLrb72xUNPfwYAqsqrTIcji0e0BjHTN6tQFIoJj/Xp02dviEMyWO2iDuVV5cIjlXPP337zk+WHNgxgsGYWstex20OJlCDA0REtpEdeNKpCnN33lKVfnxm4iYgiAMD72wZ/7YWfrwodfnXkkdaDjlA+ZY4D6EiDp4m19GXLqQVjdub3y38HlRCpeb5w40DBDBbZeoQ+c8xXfsIMCiDAielpdfVq58m1L14Rbng9cLB5r5ZCSH0ScLEgAUdHdUFuH3l18ZxNv5y8+MrbZl+9mIJurUdDQ8PZ816pevmxfS+OPNJab/uET51oMR2BYIyDYVYRn91/0g+IyAmMC6Q9fSFYAuyYbH8++nsnv+bz4SOgkojIxKcnw8z5zx94/eHNR9/VSvlEIm9NeM3uIipiIF42CoKEABsTa3bG5g6Tt48MvPD4pVWzSwaVPDXwgUVehKH319Vd873Xfv/yioY3RjuxNi1hWZETQOIZBGUEwDFt+X10Rv6o2vMnnfFUIBSS4WBYp8feBtBao69vBA3rO/k+IrJra8sFAIyrGkcE8D1//c2tLx95M4+I2ECRIeoSI/cYXkoCm6g27IjLyy5Q90/9yje/PXvhxUTU+sC6kP/9m34Rrauv+9Kd63/72yWbn3EgyRhpSWZAnKCWWQDaRFFeNFncNvV/qrkSItAtGiqiRkmPyHVG1Q0fOGU9GFSOcp3InOrq9s34cu1Dt9cdqzfS8ioDE+epuGctxL0rCQI7USc3M1tdXnDG3rtPXXRLcUG/ZQgFZKgsIIPjg+2bdm665ltrfvXbJ/e8omWWV7I5gdpLTqZSEATYHLGLM4dY5/rG3T1hxJjVgadDsls01AhbF+T3twp9Qx8hogY3+iInEAoJS0iz5M3ld77atB2kJJt4EnGcoSSb9lZ7WMFgT0XexEcfmX/HnURUFwiF5NnDj4rg+GBswwdbv/T9DU/89oX3V2vKyhTQTBx3gHSC45i11tnePtZVA8s33nnRdd/X379ThAKBbkNyoWHLXD3EmTLogueYmcrLq0wimXj7vZ2n1jZsPb+59YgGkWRywULuomUDkO1SAEbCYsXstODM0imeO8queuQPl1Z/hYjqampqVADA4mmL7Xd2vnPNPW889dgLe9dplZEpSDMlamxT79PZT6Rugg2k8QJGOURGzs0au+XOOQvnRZ6aLyvjD75bCDjDmydUrHiXlZGxOYE5B0IBKQA8vOX5778W+UCSUjrB1/YwQ0IYAWkIjjLG5hidljU+VjXmqgcumnDW92IBLTnEXFtbiyuCV+gD9QcWfnvdo799dvcabfn8QsNxH2MKPcbHMTVZ7EEUxxxL+NSVJec1/m7mzedRdlZ9JbOoDvaMnas8awjao7H7icipqalUzGyIyGx6d+v0b6xfOq890mgkeaRbTdtLV1iCwIbbo3TWgInOTSMunj+37IwVCEAiDB0Oh2UwGHQiTU2jvvbSQ4//cc9KpkyvYEd39Q69ODCOF8eBYKK6RQ/q299akDd964+m3nCp6J99MOGLep06vbEinUeDVrmlzzDBcJgUSX521/o7N7XvIWEUw6BXXEsaAqRjYojS/AEzY3eMveJzl5x+/orKUKUHYejKykoRDIfBzANvXfP4M49/8LLxCmGk45CBdjOsbrcOdpSYIJhABKM56mgyYtagidado6/+y8/nf2eub3Due5c/fbk8HnZEFWYOvrp02Pg9zEzjqsZRFQKm7ax50y97qfqClrYGI5Vfchyx5E4eOhFBA2RMLErzB89wqqcsXHBK6biVi5YssaqDi2NuSgdB1WGnevkjjz9Vv24cK9ZGeGS3LJowSbiOmEAQxiHDDJu140h4vaI0e5iYkzf23VsmB340rmTUo4s7cLrjqzkpHTb+TwkkMxAKIBgM8i/XhG99rXW3hPI4zEZ0X4kjYTkMo4xxEKEFg2fb90780iVjSsesWLRhibU0jocHAgEZrqh2fvbSk3c9sOOZuYdiH0YgvZbNttPtOHESKEt8s7xSwEL/nP4oVrk4rc/YHRX9xv38sqnn/Y6I2hAKSHap4OPmv1RNTY1KKSU0zFxwRahy1tGWQyxIykTFPXfAi/GfxqClYtPuiHkDZzh3Trly/pjSMStqampURRwPD4QCMhwM601bt066773n7mzLEhgqR/o0x1xoypg4hyUgROLZErxkIdPyIs+XA8v27hsq83aNyR/00vwxc9YOLy55IxGnJ+ikEy3VVRUVLu4VRlgAMCs3/2POjuihftC2gSVTViJQshpBGIIg4hiandkFU2PfLr00MKX0lBcXLVliVVR0EAChQMgQCPVtR46c2m/kBQNMFrwAZg6deH5uVs6Q1mirYWYhSJpMX4Z4t27Pyg8bD+wpye1HowpKuGzAUBT1KVqTIT1t7cbGt1LgqkAgcNJEfxI7eqh2GwHglbs2XLa7rZ5JWR2wPFFavElSItbeas8dNctTOTpw2+yy018MhUKeYDAY6xygAMD50+fsA7Av5dCKE03AK2sq5bjD4zgu7MkDcIlpLwWsL73w6dvffPHA+iyLJWzF8fobhjAUj6UFONpmTyoebT0wYdHjZ42fuWjpxqX46rTFNvcM2FMYYRGOs+tl27YRyoHaWvdzefzP9sPjOEGwIwAE3D3TU5Bx8uUXAKpqqwQA8+c3Vs5/3z6QDeE4DluqM6JJQsDEIs6w3IHW4pJ5j10w8cxrY6yJmbG4BxI+ReO6cy1Yoq3u9DmMf28TAFBdW20kEbZ+vO/SD5sOQrJFEBRHJ+MV80oAdsTJy8hVF/Sd9uTXz/z8tbHLL5VxjJvxX9REKBSSqIZxjBn/fvvhKbFoq5GQEiZlDINArI1FUn2l5OwDDy247SaHNXEoxP9tAgOASphSeMPKjE2N73tBwjjUEQq6nDgbbcf47KLpDdeVzjubiBqOJ9xjZhEGKBwOAwjj0LaylLml9jMXdjWAOSiH2n10lQCgN3285+J65wiUUUYLEiyMi34ww9ExPXvIdKuqbOF3R48e/c6SDUsst5imm3ILDslgOAwEw/qzLn88PsFXQ208MEAzs/eqP999WVOkBawovqRBQALQulkPzh9mzcubdPvMssm/qaypUYt7JuNNMF5+nOXxoznaNmVf06HCR9f9hXcfO5h7Vum0z9usEdM2GBq25vhKOTc71TAw0G4wlKAtDMGwhjYMFgYg4YITRkM7GgYcx7EpiWhLSfHRqWHi67g1DGx2MCajOD5lHebiWS98bdc/jm3zCShmMBETmIz2KUt+c9gl6396ybdOv+jJJ2TInSc5IWx5VZVcXe0yIFkePzZ/uONza+u2zXv38N7yd47sG1XvjdC+xv1o0+1wBMGQASdrQ9zF5NSpFiFJuLBb68JxKIbJANJ1sMYYQHdabpHKuroJd2KFBIQwiGqN83KnuVNWaM+KOY0ZEQ+ajEOClFvvQmxHovT5Yefa91x4w7X/69woAvHpx60Fq5LxiMhh5n5PbFwxu3bXGzddvereM3ZGD6Gh9RhgRwGwhvTEi1+IwQwyJnUedAWL00skOKXCKQVDJwKxSVm4Rt3g3x0LV93FaR0wtAcGjm3Dn2FBMTP9pOaPM+vbjgoIYYQhsCDYTquZ2HekvHLAjAAR7UgwlZVcmXBgDjP3ua/2DzcseOq7N26NfVS0q60O3N5iAMVSWQSPl4ghOZk1ueZsZCpMYFJW63agJRyve5HJOgLjkgmJVflJs05dGd7BTzMS6bD7XZQcnWX5xWBf1kuKiPi25Q/PaI5EQJAkmGCbmC7KGyCvHXn+q/NmnPtMZU2lCpQHDACqpmrDzEWPv/7CdZf96c7r10V2Dzx47CO3sENZECpDMnPc8kwvxGXq+kjTwa52qVIwXSoXkIbCUhdFdxRpJMF9aB2lwsyBNLXf2D8KZh6wr+1QoROJQLEkxzJswJiVVXbgpjOvvN5mLcYVjhNEZPzKy1v27LzqlpW/3FK1/Y8/eObQqwMPHqt3FHmZpEeCIQ0z/vMTd1ppKdz3UCgqUwMPfWHK515WsDEyKp1hOhZl6fMK7TQ7M/pNVNcOrbiZiLZ9ffnPvMHxwSi387AHN4bvv37dQ5f/o24zIIwjhEcSs2LWXUC8/2zjNHsyrHXfzEJ1ccn09ZRFB9Xv33iuecehvQzpgSNsk+3JVp8vnvnPedPP+isA+sWFN0Vf3frawsuf/+6PX2l8p+Boa4NRykMMpQwAIxi9Q3ndFJWkPCD+BJibezu3lwfNECDDUMQctdsxt3h2+6LpgR8eqKwUYn+kaVijaSchJZtIhC8unBG5eeYXv0JE7cxcuGTts+Hb33r88WUH1hYcbT+qlfIKA5BJlLmdIAffHf/TG1PySSxKr8q2BKI66kztf4q6esRZD1Am/RPlECrXkxWMKg2jI7HR/Uf7Li0+/XvkpW319fXnfXnZD+9f1fT2xL1NH9hK+RVzvHTxv6BJArRt24UZA6zL8mc8c9HkOVUJpEW9vndrJMJRKCl9Z+WV1X1x1vz7wpteCnzr9UdCT++vgc2tjiX8ltEAi/8CgdmtCtY65mRTpnXz8HkHv3PONbcQkWZmUY1qqLrmj/2tdhRjswbru6YFLy55LuuSn73559Dao9uM9HhYsk85bJKFfkTpS/E7yh242yohSqneTa5wNx3UTfLVPPHPXd53klrE2KmkMxG4JOIZAQEIZsdpN328eeqGkfPf/+7Z11xCRB+mJkhqSP+iS8Sut3DzKZe9tPajXdcvO/jmtRsad2qpfILZiH/lZSuJurS0UqkU1N6k1JsljhhjupZXfSJbSSCwcUybgUNq5qBp8pKiU5+4bc7Vi+O+KS0jVIciTd7zBk9FP3/B1FvWLC3aZQ6w8FsSTjyPJsAYTn8vUTdFTCeyKDWpzW7oGiKRBrqmFTRQ+mucHGgDY5iNI9jjFUOyh4q5fSY0Xjvygq+fe8ppf7jd+SK6S4GVh7yIQOPLa35c1GAaDRQJY9tuATl38EupZcWJmLnr1MjH71kTOXva2wEoWYeWDMQosc9Ie62TNqCMDFGo8jHU6oOyPiWb5xWfsfzyaXMfIqKP3NCbu10PokZ7C1BbvwlDsgp4uOgrGAbGxHFulknNEjEEdbw4SwgJAkGkvX9IIFk0n3h3SWI/fq4bYndYTvqKNyTzLUEdv0valhQQRPCy4AG5hcQO1k7KK90+d9Apfxg1fNTaRPYXiLOuPVnf/wfOOkJ6soLx5QAAAABJRU5ErkJggg==";

import {
  FolderOpen,
  Target,
  Calendar,
  ClipboardCheck,
  BarChart3,
  Puzzle,
  Shield,
  Users,
  FileText,
  Zap,
  ArrowRight,
  CheckCircle,
  ChevronDown,
} from "lucide-react";

const FEATURES = [
  {
    icon: Target,
    title: "CRM & Lead Pipeline",
    description: "Track leads from first contact to signed contract. Automated follow-ups, source tracking, and pipeline analytics.",
  },
  {
    icon: FolderOpen,
    title: "Project Management",
    description: "Manage assessments, abatement projects, and field crews. Real-time status updates and budget tracking.",
  },
  {
    icon: Calendar,
    title: "Scheduling & Time Clock",
    description: "Drag-and-drop crew scheduling with GPS time clock. Workers see their schedule on mobile.",
  },
  {
    icon: ClipboardCheck,
    title: "Compliance & Certifications",
    description: "Track CDPHE, EPA, OSHA, and IICRC certifications. Auto-alerts before expiration dates.",
  },
  {
    icon: FileText,
    title: "Estimates & Invoicing",
    description: "Generate professional estimates with COGS calculations. Send invoices through QuickBooks or your accounting system.",
  },
  {
    icon: BarChart3,
    title: "Business Metrics",
    description: "Auto-populated lead counts, revenue tracking, and Google Maps performance by office location.",
  },
  {
    icon: Puzzle,
    title: "Plug-in Integrations",
    description: "Connect QuickBooks, RingCentral, PandaDoc, Gusto, and more. Your tools, your choice.",
  },
  {
    icon: Shield,
    title: "Field Reports & Safety",
    description: "Digital field reports with photo documentation. Incident tracking and safety compliance built in.",
  },
];

const INDUSTRIES = [
  "Asbestos Abatement",
  "Lead Paint Remediation",
  "Mold Remediation",
  "Meth Lab Decontamination",
  "Hazmat Services",
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [showDemo, setShowDemo] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && (saved === "en" || saved === "es")) {
      setLanguage(saved);
    }
  }, []);

  const t = (key: TranslationKey): string => getTranslation(language, key);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase().trim(),
        password: password.trim(),
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "DatabaseError") {
          setError("Server error. Please try again in a moment.");
        } else {
          setError(t("login.invalidCredentials"));
        }
        setLoading(false);
      } else if (result?.ok) {
        router.push("/dashboard");
      } else {
        setError("Login failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError("Connection error. Please check your internet and try again.");
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    setEmail("demo@envirobase.app");
    setPassword("EnviroBase2026!");
    setShowDemo(true);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ─── HERO SECTION ─── */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-950" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative max-w-7xl mx-auto px-6 pt-8 pb-20 lg:pb-28">
          {/* Nav */}
          <nav className="flex items-center justify-between mb-16 lg:mb-24">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={INLINE_LOGO} alt="EnviroBase" height={40} style={{ height: 40, width: 'auto' }} className="flex-shrink-0" />
              <span className="text-xl font-bold text-white tracking-tight">
                {process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <a
                href="mailto:sales@envirobase.app"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Contact Sales <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="#login"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-emerald-400 border border-emerald-500/30 rounded-full hover:bg-emerald-500/10 transition-colors"
              >
                Sign In
              </a>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Headline */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <Zap className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">Purpose-built for environmental services</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] mb-6">
                One platform to run your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-green-300">
                  entire operation
                </span>
              </h1>

              <p className="text-lg text-slate-400 mb-8 max-w-lg leading-relaxed">
                CRM, project management, scheduling, compliance, invoicing, and field reporting — all in one place.
                Built by environmental professionals, for environmental professionals.
              </p>

              {/* Industry tags */}
              <div className="flex flex-wrap gap-2 mb-8">
                {INDUSTRIES.map((ind) => (
                  <span
                    key={ind}
                    className="px-3 py-1 text-xs font-medium text-slate-400 bg-slate-800/60 border border-slate-700/50 rounded-full"
                  >
                    {ind}
                  </span>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#login"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
                >
                  Try the Demo <ArrowRight className="w-4 h-4" />
                </a>
                <a
                  href="#features"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-slate-300 bg-slate-800/60 border border-slate-700/50 rounded-full hover:bg-slate-800 transition-colors"
                >
                  See Features <ChevronDown className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Right — Login Form */}
            <div id="login" className="lg:pl-8">
              <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-white">{t("login.title")}</h2>
                  <p className="text-sm text-slate-400 mt-1">{t("login.subtitle")}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("login.emailLabel")}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="email"
                      className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">{t("login.passwordLabel")}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoCapitalize="none"
                      autoCorrect="off"
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 bg-slate-800/60 border border-slate-700/60 rounded-xl text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 outline-none transition"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="text-right">
                    <Link href="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
                      Forgot Password?
                    </Link>
                  </div>

                  {error && (
                    <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl transition disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                  >
                    {loading ? t("login.signingIn") : t("login.signIn")}
                  </button>
                </form>

                {/* Demo Access */}
                <div className="mt-5 pt-5 border-t border-slate-800/80">
                  {!showDemo ? (
                    <button
                      type="button"
                      onClick={handleDemoLogin}
                      className="w-full py-2.5 text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl hover:bg-emerald-500/20 transition-colors"
                    >
                      Try the Demo
                    </button>
                  ) : (
                    <div className="text-center space-y-2">
                      <p className="text-xs text-slate-400">Demo credentials filled in — click Sign In above</p>
                      <p className="text-[10px] text-slate-500">demo@envirobase.app / EnviroBase2026!</p>
                    </div>
                  )}
                </div>

                {/* Contact sales link */}
                <div className="mt-4 text-center">
                  <p className="text-xs text-slate-500">
                    Interested in EnviroBase?{" "}
                    <a href="mailto:sales@envirobase.app" className="text-emerald-400 hover:text-emerald-300 font-medium">
                      Contact sales
                    </a>
                  </p>
                </div>

                {/* Language selector */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setLanguage("en"); localStorage.setItem("language", "en"); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      language === "en"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-slate-800/40 text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLanguage("es"); localStorage.setItem("language", "es"); }}
                    className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      language === "es"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-slate-800/40 text-slate-500 hover:text-slate-400"
                    }`}
                  >
                    Español
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FEATURES GRID ─── */}
      <section id="features" className="relative py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything you need, nothing you don&apos;t
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Replace your spreadsheets, disconnected tools, and manual processes with a single platform
              designed for environmental service companies.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group p-5 bg-slate-900/50 border border-slate-800/60 rounded-2xl hover:border-emerald-500/30 hover:bg-slate-900/80 transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="font-semibold text-white text-sm mb-2">{feature.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── WHITE LABEL / SAAS SECTION ─── */}
      <section className="relative py-20 lg:py-28 border-t border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400">White-Label SaaS</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
                Your brand. Your platform.
              </h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                EnviroBase is fully white-labelable. Deploy it under your own brand with your logo, colors, and domain.
                Each tenant gets their own isolated database, custom integrations, and admin controls.
              </p>
              <ul className="space-y-3">
                {[
                  "Custom branding — your logo, colors, and domain",
                  "Plug-in marketplace — connect your own accounting, phone, and payroll tools",
                  "Role-based access — Admin, Office, Supervisor, and Technician roles",
                  "Multi-language support — English, Spanish, and Portuguese",
                  "Mobile-ready — works on any device with PWA support",
                  "API-first architecture — integrate with anything",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                    <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Active Integrations", value: "13+", sub: "and growing" },
                { label: "User Roles", value: "4", sub: "with granular permissions" },
                { label: "Languages", value: "3", sub: "EN / ES / PT" },
                { label: "Compliance Frameworks", value: "5+", sub: "CDPHE, EPA, OSHA..." },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-5 bg-slate-900/50 border border-slate-800/60 rounded-2xl text-center"
                >
                  <p className="text-3xl font-bold text-emerald-400">{stat.value}</p>
                  <p className="text-xs font-medium text-white mt-1">{stat.label}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="relative py-16 border-t border-slate-800/50">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
            Ready to see it in action?
          </h2>
          <p className="text-slate-400 mb-8">
            Log in with the demo account and explore every feature. No account required.
          </p>
          <a
            href="#login"
            className="inline-flex items-center gap-2 px-8 py-3.5 text-sm font-semibold text-white bg-emerald-600 rounded-full hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
          >
            Try the Demo <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-slate-800/50 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={INLINE_LOGO} alt="EnviroBase" height={24} style={{ height: 24, width: 'auto' }} className="flex-shrink-0" />
            <span className="text-sm font-medium text-slate-500">
              {process.env.NEXT_PUBLIC_COMPANY_SHORT || "EnviroBase"} &copy; {new Date().getFullYear()}
            </span>
          </div>
          <p className="text-xs text-slate-600">
            Built by{" "}
            <a href="https://necteraholdings.com" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-400 transition-colors">
              Nectera Holdings
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
